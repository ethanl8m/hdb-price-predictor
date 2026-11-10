import { MLFeatures, FEATURE_KEYS, featuresToArray } from './types';

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  splitThreshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  gain?: number;
}

export interface XGBoostModel {
  basePrediction: number;
  trees: TreeNode[];
  learningRate: number;
  featureImportances: Record<keyof MLFeatures, number>;
  predict: (features: MLFeatures) => number;
}

export function trainXGBoost(
  X: MLFeatures[],
  y: number[],
  params: {
    nEstimators: number;
    maxDepth: number;
    learningRate: number;
    regLambda: number;
  }
): XGBoostModel {
  const n = y.length;
  if (n === 0) {
    return {
      basePrediction: 500000,
      trees: [],
      learningRate: params.learningRate,
      featureImportances: {} as any,
      predict: () => 500000
    };
  }

  // Base prediction: mean target price
  const basePrediction = y.reduce((sum, val) => sum + val, 0) / n;
  const currentPreds = new Float64Array(n).fill(basePrediction);
  const trees: TreeNode[] = [];

  const featureImportanceAccum: number[] = new Array(FEATURE_KEYS.length).fill(0);
  const matrixX = X.map(featuresToArray);

  for (let t = 0; t < params.nEstimators; t++) {
    // Compute gradients and hessians for MSE loss
    // g_i = pred - y, h_i = 1
    const gradients = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      gradients[i] = currentPreds[i] - y[i];
    }

    // Build decision tree using greedy split finding
    const tree = buildTree(
      matrixX,
      gradients,
      Array.from({ length: n }, (_, i) => i),
      0,
      params.maxDepth,
      params.regLambda,
      featureImportanceAccum
    );

    trees.push(tree);

    // Update predictions with shrinkage (learning rate)
    for (let i = 0; i < n; i++) {
      const predLeaf = predictTree(tree, matrixX[i]);
      currentPreds[i] += params.learningRate * predLeaf;
    }
  }

  // Normalize feature importance to 0..100%
  const totalGain = featureImportanceAccum.reduce((a, b) => a + b, 0) || 1;
  const featureImportances = {} as Record<keyof MLFeatures, number>;
  FEATURE_KEYS.forEach((key, idx) => {
    featureImportances[key] = Math.round((featureImportanceAccum[idx] / totalGain) * 1000) / 10;
  });

  const predict = (features: MLFeatures): number => {
    const row = featuresToArray(features);
    let pred = basePrediction;
    for (const tree of trees) {
      pred += params.learningRate * predictTree(tree, row);
    }
    return Math.round(pred);
  };

  return {
    basePrediction,
    trees,
    learningRate: params.learningRate,
    featureImportances,
    predict
  };
}

function buildTree(
  X: number[][],
  gradients: Float64Array,
  indices: number[],
  depth: number,
  maxDepth: number,
  regLambda: number,
  featureImportances: number[]
): TreeNode {
  const n = indices.length;
  let totalG = 0;
  for (const idx of indices) {
    totalG += gradients[idx];
  }
  const totalH = n;

  // Leaf condition: max depth reached or too few samples
  if (depth >= maxDepth || n <= 3) {
    const leafWeight = -totalG / (totalH + regLambda);
    return { isLeaf: true, value: leafWeight };
  }

  let bestGain = -Infinity;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeftIndices: number[] = [];
  let bestRightIndices: number[] = [];

  const rootScore = (totalG * totalG) / (totalH + regLambda);

  // Scan features for split
  for (let f = 0; f < FEATURE_KEYS.length; f++) {
    // Collect distinct values for candidates
    const values = indices.map(i => X[i][f]);
    values.sort((a, b) => a - b);

    // Test a sample of percentile candidate thresholds
    const step = Math.max(1, Math.floor(values.length / 8));
    for (let k = step; k < values.length; k += step) {
      const threshold = (values[k - 1] + values[k]) / 2;
      if (threshold === values[k]) continue;

      let leftG = 0;
      let leftCount = 0;
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];

      for (const idx of indices) {
        if (X[idx][f] <= threshold) {
          leftG += gradients[idx];
          leftCount++;
          leftIdx.push(idx);
        } else {
          rightIdx.push(idx);
        }
      }

      const rightCount = n - leftCount;
      if (leftCount < 2 || rightCount < 2) continue;

      const rightG = totalG - leftG;
      const leftH = leftCount;
      const rightH = rightCount;

      const splitGain = 0.5 * (
        (leftG * leftG) / (leftH + regLambda) +
        (rightG * rightG) / (rightH + regLambda) -
        rootScore
      );

      if (splitGain > bestGain) {
        bestGain = splitGain;
        bestFeature = f;
        bestThreshold = threshold;
        bestLeftIndices = leftIdx;
        bestRightIndices = rightIdx;
      }
    }
  }

  if (bestGain <= 0.01 || bestFeature === -1 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
    const leafWeight = -totalG / (totalH + regLambda);
    return { isLeaf: true, value: leafWeight };
  }

  // Accumulate split gain to feature importance
  featureImportances[bestFeature] += bestGain;

  const leftNode = buildTree(X, gradients, bestLeftIndices, depth + 1, maxDepth, regLambda, featureImportances);
  const rightNode = buildTree(X, gradients, bestRightIndices, depth + 1, maxDepth, regLambda, featureImportances);

  return {
    isLeaf: false,
    featureIndex: bestFeature,
    splitThreshold: bestThreshold,
    gain: bestGain,
    left: leftNode,
    right: rightNode
  };
}

function predictTree(node: TreeNode, x: number[]): number {
  if (node.isLeaf) {
    return node.value ?? 0;
  }
  if (node.featureIndex !== undefined && node.splitThreshold !== undefined) {
    if (x[node.featureIndex] <= node.splitThreshold) {
      return predictTree(node.left!, x);
    } else {
      return predictTree(node.right!, x);
    }
  }
  return 0;
}
