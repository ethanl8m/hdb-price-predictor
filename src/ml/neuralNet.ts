import { MLFeatures, FEATURE_KEYS, featuresToArray } from './types';

export interface NeuralNetModel {
  weights1: number[][]; // [inputDim][hiddenDim1]
  bias1: number[];      // [hiddenDim1]
  weights2: number[][]; // [hiddenDim1][hiddenDim2]
  bias2: number[];      // [hiddenDim2]
  weights3: number[];   // [hiddenDim2]
  bias3: number;        // scalar
  featureMeans: number[];
  featureStds: number[];
  targetMean: number;
  targetStd: number;
  featureImportances: Record<keyof MLFeatures, number>;
  epochLosses: number[];
  predict: (features: MLFeatures) => number;
}

export function trainNeuralNetwork(
  X: MLFeatures[],
  y: number[],
  params: {
    epochs: number;
    learningRate: number;
    hiddenDim1: number;
    hiddenDim2: number;
  }
): NeuralNetModel {
  const n = y.length;
  const inputDim = FEATURE_KEYS.length;
  const matrixX = X.map(featuresToArray);

  // 1. Calculate Mean & Std for standardization
  const featureMeans: number[] = new Array(inputDim).fill(0);
  const featureStds: number[] = new Array(inputDim).fill(0);

  for (let j = 0; j < inputDim; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += matrixX[i][j];
    featureMeans[j] = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      const d = matrixX[i][j] - featureMeans[j];
      varSum += d * d;
    }
    featureStds[j] = Math.sqrt(varSum / n) || 1.0;
  }

  let targetSum = 0;
  for (let i = 0; i < n; i++) targetSum += y[i];
  const targetMean = targetSum / n;
  let targetVarSum = 0;
  for (let i = 0; i < n; i++) {
    const d = y[i] - targetMean;
    targetVarSum += d * d;
  }
  const targetStd = Math.sqrt(targetVarSum / n) || 1.0;

  // Normalized datasets
  const normX: number[][] = matrixX.map(row => 
    row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
  );
  const normY: number[] = y.map(val => (val - targetMean) / targetStd);

  // 2. Initialize weights using He/Xavier uniform
  const h1 = params.hiddenDim1;
  const h2 = params.hiddenDim2;

  const initWeight = (fanIn: number, fanOut: number) => {
    const limit = Math.sqrt(6 / (fanIn + fanOut));
    const mat: number[][] = [];
    for (let i = 0; i < fanIn; i++) {
      const row: number[] = [];
      for (let j = 0; j < fanOut; j++) {
        row.push((Math.random() * 2 - 1) * limit);
      }
      mat.push(row);
    }
    return mat;
  };

  const weights1 = initWeight(inputDim, h1);
  const bias1 = new Array(h1).fill(0.01);

  const weights2 = initWeight(h1, h2);
  const bias2 = new Array(h2).fill(0.01);

  const weights3: number[] = [];
  const limit3 = Math.sqrt(6 / (h2 + 1));
  for (let j = 0; j < h2; j++) {
    weights3.push((Math.random() * 2 - 1) * limit3);
  }
  let bias3 = 0.0;

  // Adam optimizer caches
  const mW1 = weights1.map(r => new Array(r.length).fill(0));
  const vW1 = weights1.map(r => new Array(r.length).fill(0));
  const mB1 = new Array(h1).fill(0);
  const vB1 = new Array(h1).fill(0);

  const mW2 = weights2.map(r => new Array(r.length).fill(0));
  const vW2 = weights2.map(r => new Array(r.length).fill(0));
  const mB2 = new Array(h2).fill(0);
  const vB2 = new Array(h2).fill(0);

  const mW3 = new Array(h2).fill(0);
  const vW3 = new Array(h2).fill(0);
  let mB3 = 0;
  let vB3 = 0;

  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  const l2Reg = 0.001;

  const epochLosses: number[] = [];

  // Activation: LeakyReLU to prevent dying neurons
  const relu = (z: number) => (z > 0 ? z : 0.05 * z);
  const reluDeriv = (z: number) => (z > 0 ? 1 : 0.05);

  let step = 0;

  // Training loop
  for (let ep = 0; ep < params.epochs; ep++) {
    let epochLoss = 0;

    // Mini-batch or full-batch gradient descent
    const batchSize = Math.min(64, n);
    for (let b = 0; b < n; b += batchSize) {
      step++;
      const currentBatchEnd = Math.min(b + batchSize, n);
      const bLen = currentBatchEnd - b;

      // Accumulated gradients
      const gradW1 = weights1.map(r => new Array(r.length).fill(0));
      const gradB1 = new Array(h1).fill(0);
      const gradW2 = weights2.map(r => new Array(r.length).fill(0));
      const gradB2 = new Array(h2).fill(0);
      const gradW3 = new Array(h2).fill(0);
      let gradB3 = 0;

      for (let i = b; i < currentBatchEnd; i++) {
        const x = normX[i];
        const target = normY[i];

        // Forward pass
        const z1 = new Array(h1).fill(0);
        const a1 = new Array(h1).fill(0);
        for (let j = 0; j < h1; j++) {
          let sum = bias1[j];
          for (let k = 0; k < inputDim; k++) sum += x[k] * weights1[k][j];
          z1[j] = sum;
          a1[j] = relu(sum);
        }

        const z2 = new Array(h2).fill(0);
        const a2 = new Array(h2).fill(0);
        for (let j = 0; j < h2; j++) {
          let sum = bias2[j];
          for (let k = 0; k < h1; k++) sum += a1[k] * weights2[k][j];
          z2[j] = sum;
          a2[j] = relu(sum);
        }

        let yPred = bias3;
        for (let j = 0; j < h2; j++) yPred += a2[j] * weights3[j];

        const error = yPred - target;
        epochLoss += error * error;

        // Backward pass
        const delta3 = error; // dL/dyPred
        gradB3 += delta3;
        for (let j = 0; j < h2; j++) {
          gradW3[j] += delta3 * a2[j];
        }

        const delta2 = new Array(h2).fill(0);
        for (let j = 0; j < h2; j++) {
          delta2[j] = delta3 * weights3[j] * reluDeriv(z2[j]);
          gradB2[j] += delta2[j];
          for (let k = 0; k < h1; k++) {
            gradW2[k][j] += delta2[j] * a1[k];
          }
        }

        for (let k = 0; k < h1; k++) {
          let sumDelta2W = 0;
          for (let j = 0; j < h2; j++) sumDelta2W += delta2[j] * weights2[k][j];
          const delta1_k = sumDelta2W * reluDeriv(z1[k]);
          gradB1[k] += delta1_k;
          for (let f = 0; f < inputDim; f++) {
            gradW1[f][k] += delta1_k * x[f];
          }
        }
      }

      // Adam update for layer 3
      const lr = params.learningRate;
      const bScale = 1 / bLen;

      const gB3 = gradB3 * bScale;
      mB3 = beta1 * mB3 + (1 - beta1) * gB3;
      vB3 = beta2 * vB3 + (1 - beta2) * gB3 * gB3;
      const mB3Hat = mB3 / (1 - Math.pow(beta1, step));
      const vB3Hat = vB3 / (1 - Math.pow(beta2, step));
      bias3 -= (lr / (Math.sqrt(vB3Hat) + eps)) * mB3Hat;

      for (let j = 0; j < h2; j++) {
        const gW3 = gradW3[j] * bScale + l2Reg * weights3[j];
        mW3[j] = beta1 * mW3[j] + (1 - beta1) * gW3;
        vW3[j] = beta2 * vW3[j] + (1 - beta2) * gW3 * gW3;
        const mHat = mW3[j] / (1 - Math.pow(beta1, step));
        const vHat = vW3[j] / (1 - Math.pow(beta2, step));
        weights3[j] -= (lr / (Math.sqrt(vHat) + eps)) * mHat;
      }

      // Adam update for layer 2
      for (let k = 0; k < h1; k++) {
        for (let j = 0; j < h2; j++) {
          const gW2 = gradW2[k][j] * bScale + l2Reg * weights2[k][j];
          mW2[k][j] = beta1 * mW2[k][j] + (1 - beta1) * gW2;
          vW2[k][j] = beta2 * vW2[k][j] + (1 - beta2) * gW2 * gW2;
          const mHat = mW2[k][j] / (1 - Math.pow(beta1, step));
          const vHat = vW2[k][j] / (1 - Math.pow(beta2, step));
          weights2[k][j] -= (lr / (Math.sqrt(vHat) + eps)) * mHat;
        }
      }
      for (let j = 0; j < h2; j++) {
        const gB2 = gradB2[j] * bScale;
        mB2[j] = beta1 * mB2[j] + (1 - beta1) * gB2;
        vB2[j] = beta2 * vB2[j] + (1 - beta2) * gB2 * gB2;
        const mHat = mB2[j] / (1 - Math.pow(beta1, step));
        const vHat = vB2[j] / (1 - Math.pow(beta2, step));
        bias2[j] -= (lr / (Math.sqrt(vHat) + eps)) * mHat;
      }

      // Adam update for layer 1
      for (let f = 0; f < inputDim; f++) {
        for (let k = 0; k < h1; k++) {
          const gW1 = gradW1[f][k] * bScale + l2Reg * weights1[f][k];
          mW1[f][k] = beta1 * mW1[f][k] + (1 - beta1) * gW1;
          vW1[f][k] = beta2 * vW1[f][k] + (1 - beta2) * gW1 * gW1;
          const mHat = mW1[f][k] / (1 - Math.pow(beta1, step));
          const vHat = vW1[f][k] / (1 - Math.pow(beta2, step));
          weights1[f][k] -= (lr / (Math.sqrt(vHat) + eps)) * mHat;
        }
      }
      for (let k = 0; k < h1; k++) {
        const gB1 = gradB1[k] * bScale;
        mB1[k] = beta1 * mB1[k] + (1 - beta1) * gB1;
        vB1[k] = beta2 * vB1[k] + (1 - beta2) * gB1 * gB1;
        const mHat = mB1[k] / (1 - Math.pow(beta1, step));
        const vHat = vB1[k] / (1 - Math.pow(beta2, step));
        bias1[k] -= (lr / (Math.sqrt(vHat) + eps)) * mHat;
      }
    }

    epochLosses.push(Math.round((epochLoss / n) * 1000) / 1000);
  }

  // Predict function
  const predict = (features: MLFeatures): number => {
    const raw = featuresToArray(features);
    const x = raw.map((val, j) => (val - featureMeans[j]) / featureStds[j]);

    const a1: number[] = new Array(h1);
    for (let j = 0; j < h1; j++) {
      let sum = bias1[j];
      for (let k = 0; k < inputDim; k++) sum += x[k] * weights1[k][j];
      a1[j] = relu(sum);
    }

    const a2: number[] = new Array(h2);
    for (let j = 0; j < h2; j++) {
      let sum = bias2[j];
      for (let k = 0; k < h1; k++) sum += a1[k] * weights2[k][j];
      a2[j] = relu(sum);
    }

    let yNorm = bias3;
    for (let j = 0; j < h2; j++) yNorm += a2[j] * weights3[j];

    // De-standardize target
    const price = yNorm * targetStd + targetMean;
    return Math.round(price);
  };

  // Compute feature importance via input gradient sensitivity
  const featureImportances = {} as Record<keyof MLFeatures, number>;
  const totalWeightScores = new Array(inputDim).fill(0);

  for (let f = 0; f < inputDim; f++) {
    let score = 0;
    for (let k = 0; k < h1; k++) {
      let w2w3Sum = 0;
      for (let j = 0; j < h2; j++) {
        w2w3Sum += Math.abs(weights2[k][j] * weights3[j]);
      }
      score += Math.abs(weights1[f][k]) * w2w3Sum;
    }
    totalWeightScores[f] = score;
  }

  const totalScoreSum = totalWeightScores.reduce((a, b) => a + b, 0) || 1;
  FEATURE_KEYS.forEach((key, idx) => {
    featureImportances[key] = Math.round((totalWeightScores[idx] / totalScoreSum) * 1000) / 10;
  });

  return {
    weights1,
    bias1,
    weights2,
    bias2,
    weights3,
    bias3,
    featureMeans,
    featureStds,
    targetMean,
    targetStd,
    featureImportances,
    epochLosses,
    predict
  };
}
