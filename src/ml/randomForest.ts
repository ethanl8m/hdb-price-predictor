import { MLFeatures, FEATURE_KEYS, featuresToArray } from './types';

interface RFTreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  splitThreshold?: number;
  left?: RFTreeNode;
  right?: RFTreeNode;
}

export interface RandomForestModel {
  trees: RFTreeNode[];
  nEstimators: number;
  featureImportances: Record<keyof MLFeatures, number>;
  predict: (features: MLFeatures) => number;
}

export function trainRandomForest(
  X: MLFeatures[],
  y: number[],
  params: {
    nEstimators: number;
    maxDepth: number;
    minSamplesSplit: number;
    featureFraction: number;
  }
): RandomForestModel {
  const n = y.length;
  if (n === 0) {
    return {
      trees: [],
      nEstimators: 0,
      featureImportances: {} as any,
      predict: () => 500000
    };
  }

  const matrixX = X.map(featuresToArray);
  const trees: RFTreeNode[] = [];
  const featureImportanceAccum: number[] = new Array(FEATURE_KEYS.length).fill(0);

  const numFeaturesToSample = Math.max(
    2,
    Math.floor(FEATURE_KEYS.length * params.featureFraction)
  );

  for (let t = 0; t < params.nEstimators; t++) {
    // 1. Bootstrap sampling with replacement
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(Math.random() * n));
    }

    // 2. Build randomized tree
    const tree = buildRFTree(
      matrixX,
      y,
      bootIndices,
      0,
      params.maxDepth,
      params.minSamplesSplit,
      numFeaturesToSample,
      featureImportanceAccum
    );

    trees.push(tree);
  }

  // Normalize feature importances
  const totalImp = featureImportanceAccum.reduce((a, b) => a + b, 0) || 1;
  const featureImportances = {} as Record<keyof MLFeatures, number>;
  FEATURE_KEYS.forEach((key, idx) => {
    featureImportances[key] = Math.round((featureImportanceAccum[idx] / totalImp) * 1000) / 10;
  });

  const predict = (features: MLFeatures): number => {
    const row = featuresToArray(features);
    let sum = 0;
    for (const tree of trees) {
      sum += predictRFTree(tree, row);
    }
    return Math.round(sum / trees.length);
  };

  return {
    trees,
    nEstimators: params.nEstimators,
    featureImportances,
    predict
  };
}

function buildRFTree(
  X: number[][],
  y: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minSamplesSplit: number,
  featuresToSample: number,
  importanceAccum: number[]
): RFTreeNode {
  const n = indices.length;

  // Calculate mean target value for current node
  let sumY = 0;
  for (const idx of indices) {
    sumY += y[idx];
  }
  const meanY = sumY / n;

  // Stopping criteria
  if (depth >= maxDepth || n <= minSamplesSplit) {
    return { isLeaf: true, value: meanY };
  }

  // Calculate current node variance
  let currentVar = 0;
  for (const idx of indices) {
    const diff = y[idx] - meanY;
    currentVar += diff * diff;
  }
  const currentMse = currentVar / n;

  // Randomly sample a subset of features
  const candidateFeatures: number[] = [];
  const allFeatureIndices = Array.from({ length: FEATURE_KEYS.length }, (_, i) => i);
  // Shuffle
  for (let i = allFeatureIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allFeatureIndices[i], allFeatureIndices[j]] = [allFeatureIndices[j], allFeatureIndices[i]];
  }
  for (let i = 0; i < featuresToSample; i++) {
    candidateFeatures.push(allFeatureIndices[i]);
  }

  let bestReduction = -1;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeftIndices: number[] = [];
  let bestRightIndices: number[] = [];

  for (const f of candidateFeatures) {
    const values = indices.map(i => X[i][f]);
    values.sort((a, b) => a - b);

    const step = Math.max(1, Math.floor(values.length / 6));
    for (let k = step; k < values.length; k += step) {
      const threshold = (values[k - 1] + values[k]) / 2;
      if (threshold === values[k]) continue;

      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      let leftSumY = 0;
      let rightSumY = 0;

      for (const idx of indices) {
        if (X[idx][f] <= threshold) {
          leftIdx.push(idx);
          leftSumY += y[idx];
        } else {
          rightIdx.push(idx);
        }
      }

      if (leftIdx.length < 2 || rightIdx.length < 2) continue;

      const leftMean = leftSumY / leftIdx.length;
      const rightMean = rightSumY / rightIdx.length;

      let leftVar = 0;
      for (const idx of leftIdx) {
        const d = y[idx] - leftMean;
        leftVar += d * d;
      }

      let rightVar = 0;
      for (const idx of rightIdx) {
        const d = y[idx] - rightMean;
        rightVar += d * d;
      }

      const postSplitMse = (leftVar + rightVar) / n;
      const reduction = currentMse - postSplitMse;

      if (reduction > bestReduction) {
        bestReduction = reduction;
        bestFeature = f;
        bestThreshold = threshold;
        bestLeftIndices = leftIdx;
        bestRightIndices = rightIdx;
      }
    }
  }

  if (bestReduction <= 0 || bestFeature === -1) {
    return { isLeaf: true, value: meanY };
  }

  importanceAccum[bestFeature] += bestReduction * n;

  const left = buildRFTree(X, y, bestLeftIndices, depth + 1, maxDepth, minSamplesSplit, featuresToSample, importanceAccum);
  const right = buildRFTree(X, y, bestRightIndices, depth + 1, maxDepth, minSamplesSplit, featuresToSample, importanceAccum);

  return {
    isLeaf: false,
    featureIndex: bestFeature,
    splitThreshold: bestThreshold,
    left,
    right
  };
}

function predictRFTree(node: RFTreeNode, x: number[]): number {
  if (node.isLeaf) {
    return node.value ?? 0;
  }
  if (node.featureIndex !== undefined && node.splitThreshold !== undefined) {
    if (x[node.featureIndex] <= node.splitThreshold) {
      return predictRFTree(node.left!, x);
    } else {
      return predictRFTree(node.right!, x);
    }
  }
  return 0;
}
