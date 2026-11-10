import React, { useState } from 'react';
import { 
  Cpu, 
  GitBranch, 
  Network, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

export const ModelInspector: React.FC = () => {
  const [activeModel, setActiveModel] = useState<'xgboost' | 'random_forest' | 'neural_network'>('xgboost');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Machine Learning Algorithm Mechanics & Architecture</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deep dive into the mathematical formulations, loss objectives, and strengths of each model on HDB resale pricing.
            </p>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveModel('xgboost')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'xgboost'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              1) XGBoost (GBDT)
            </button>
            <button
              type="button"
              onClick={() => setActiveModel('random_forest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'random_forest'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              2) Random Forest
            </button>
            <button
              type="button"
              onClick={() => setActiveModel('neural_network')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'neural_network'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              3) Neural Net (ANN)
            </button>
          </div>
        </div>
      </div>

      {/* Model Detail Content */}
      {activeModel === 'xgboost' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Cpu className="w-5 h-5" />
              <span>XGBoost (Extreme Gradient Boosted Regression Trees)</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              XGBoost is an optimized distributed gradient boosting library designed to be highly efficient, flexible, and portable. In our HDB resale application, it minimizes Mean Squared Error using a second-order Taylor expansion of the loss function with explicit L2 leaf regularization.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs font-mono">
              <div className="text-slate-500 font-sans font-semibold text-[11px]">
                1. Objective Function with Regularization:
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                L^(t) = Σ [ l(y_i, ŷ_i^(t-1) + f_t(x_i)) ] + Ω(f_t)
                <br />
                where Ω(f) = γ T + 0.5 λ Σ w_j²
              </div>

              <div className="text-slate-500 font-sans font-semibold text-[11px] pt-2">
                2. Optimal Leaf Weight & Split Gain:
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                w_j* = - ( Σ g_i ) / ( Σ h_i + λ )
                <br />
                Gain = 0.5 * [ (G_L)²/(H_L + λ) + (G_R)²/(H_R + λ) - (G_L+G_R)²/(H_L+H_R + λ) ] - γ
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Why XGBoost Excels in Singapore HDB Valuation:
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Handles Non-Linear Thresholds:</strong> Captures sharp price inflection tiers (e.g. 15-month wait-out for private downgraders, remaining lease hitting &lt;60-year loan thresholds).</li>
                <li><strong>Gradient Shrinkage:</strong> The learning rate (eta) prevents individual trees from memorizing localized price outliers or unique million-dollar penthouse transactions.</li>
                <li><strong>Native Feature Gain:</strong> Provides exact mathematical split gain attribution for each housing feature.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Model Profile: XGBoost
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Paradigm</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Gradient Boosted Trees</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Loss Function</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">MSE with L2 Regularization</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Tabular Suitability</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Exceptional (Industry Gold Standard)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Inference Speed</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">&lt; 0.1ms per transaction</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Best For</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Micro-location & Lease cliffs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModel === 'random_forest' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
              <GitBranch className="w-5 h-5" />
              <span>Random Forest Regressor (Bootstrap Bagging)</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Random Forest builds an ensemble of decorrelated regression decision trees trained on bootstrap samples of historical transactions. At every decision node, only a random subset of features is evaluated, minimizing variance without increasing bias.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs font-mono">
              <div className="text-slate-500 font-sans font-semibold text-[11px]">
                1. Ensemble Averaging & Variance Reduction:
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                {"ŷ(x) = (1 / B) Σ_{b=1}^B T_b(x; Θ_b)"}
                <br />
                {"Var(Ensemble) = ρ σ² + (1 - ρ) / B * σ²"}
              </div>

              <div className="text-slate-500 font-sans font-semibold text-[11px] pt-2">
                2. Impurity Reduction (Variance Splitting):
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                Δ Var = Var(S) - [ (|S_L|/|S|) Var(S_L) + (|S_R|/|S|) Var(S_R) ]
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Key Benefits in Real Estate Valuation:
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Resistant to Overfitting:</strong> Averaging across independent bootstrap samples creates robust generalization across diverse towns.</li>
                <li><strong>No Feature Scaling Required:</strong> Tree splits are invariant to monotonic transformations of area or remaining lease.</li>
                <li><strong>Out-of-Bag (OOB) Stability:</strong> Delivers realistic baseline valuations without erratic extrapolation.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Model Profile: Random Forest
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Paradigm</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Bagging (Bootstrap Aggregation)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Subspace Sampling</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Random Feature Subsets (mtry)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Stability</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">High Variance Robustness</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Parallel Training</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Fully Independent Trees</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Best For</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Consistent, conservative benchmarks</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModel === 'neural_network' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
              <Network className="w-5 h-5" />
              <span>Artificial Neural Network (Deep Multi-Layer Perceptron)</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The Artificial Neural Network (ANN) uses multiple densely connected layers parameterized with learnable weights and biases. Non-linear LeakyReLU activations enable continuous functional approximation of compound macroeconomic interest rate (SORA) and resale price dynamics.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs font-mono">
              <div className="text-slate-500 font-sans font-semibold text-[11px]">
                1. Forward Propagation & Layer Activations:
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                a^(l) = σ( W^(l) · a^(l-1) + b^(l) )
                <br />
                where σ(z) = max(0.05z, z) [LeakyReLU]
              </div>

              <div className="text-slate-500 font-sans font-semibold text-[11px] pt-2">
                2. Adam Adaptive Moment Estimation Optimizer:
              </div>
              <div className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                {"m_t = β_1 · m_{t-1} + (1 - β_1) · g_t"}
                <br />
                {"v_t = β_2 · v_{t-1} + (1 - β_2) · g_t²"}
                <br />
                {"θ_t = θ_{t-1} - (η / √(v̂_t + ε)) · m̂_t"}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Key Strengths in Continuous Valuation:
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Smooth Continuous Manifold:</strong> Unlike tree algorithms that produce step-wise piecewise constant predictions, ANN produces smooth continuous gradients across floor area and lease.</li>
                <li><strong>Compound Macro Interactions:</strong> Learns high-dimensional interplay between SORA mortgage benchmarks, national RPI trends, and localized town premiums.</li>
                <li><strong>End-to-End Differentiability:</strong> Enables gradient saliency mapping for feature sensitivity.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Model Profile: Neural Network
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Architecture</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Dense MLP (9 → 16 → 8 → 1)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Optimizer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Adam (Adaptive Moments)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Feature Scaling</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">Z-Score Normalization (μ, σ)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Regularization</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">L2 Weight Decay (λ=0.001)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Best For</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Smooth curve extrapolation & SORA sensitivity</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
