"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface RoundData {
  round_number: number;
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  participation_count: number;
  key_insights: string[];
  clusters?: Array<{
    theme: string;
    positions: string[];
    expert_ids: string[];
    confidence_range: [number, number];
  }>;
}

interface RoundEvolutionProps {
  rounds: RoundData[];
  convergenceMetrics?: {
    position_stability: number;
    consensus_clarity: number;
    confidence_spread: number;
    citation_overlap: number;
    rounds_completed: number;
    termination_reason: string;
  };
}

function MetricBar({ 
  label, 
  value, 
  maxValue = 1, 
  color = "blue",
  showPercentage = true,
}: { 
  label: string; 
  value: number; 
  maxValue?: number;
  color?: "blue" | "green" | "amber" | "red";
  showPercentage?: boolean;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {showPercentage ? `${percentage.toFixed(0)}%` : value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function RoundCard({ round, isLast }: { round: RoundData; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-14 w-0.5 h-full bg-gradient-to-b from-blue-500 to-blue-200" />
      )}
      
      <div className="flex gap-4">
        {/* Round number badge */}
        <div className="relative z-10 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {round.round_number}
          </div>
        </div>

        {/* Round content */}
        <div className="flex-1 pb-8">
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Round {round.round_number}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {round.participation_count} experts
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {round.average_confidence.toFixed(1)}/10 avg confidence
                  </span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{round.consensus_areas.length}</div>
                  <div className="text-xs text-emerald-700">Consensus Areas</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{round.divergence_areas.length}</div>
                  <div className="text-xs text-amber-700">Divergence Areas</div>
                </div>
              </div>

              {/* Expand indicator */}
              <div className="flex items-center justify-center text-slate-400 text-sm">
                <span>{isExpanded ? "Click to collapse" : "Click to expand"}</span>
                <svg 
                  className={cn("w-4 h-4 ml-1 transition-transform", isExpanded && "rotate-180")}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Consensus areas */}
                {round.consensus_areas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Consensus Areas</h4>
                    <ul className="space-y-1">
                      {round.consensus_areas.map((area, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">&#10003;</span>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Divergence areas */}
                {round.divergence_areas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Divergence Areas</h4>
                    <ul className="space-y-1">
                      {round.divergence_areas.map((area, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">&#8226;</span>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key insights */}
                {round.key_insights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Key Insights</h4>
                    <ul className="space-y-1">
                      {round.key_insights.map((insight, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">&#9733;</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clusters */}
                {round.clusters && round.clusters.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Expert Clusters & Positions</h4>
                    <div className="space-y-3">
                      {round.clusters.map((cluster, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-slate-800 text-sm">{cluster.theme}</div>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {cluster.expert_ids.length} expert{cluster.expert_ids.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mb-2">
                            Confidence range: {cluster.confidence_range[0]}-{cluster.confidence_range[1]}/10
                          </div>
                          {cluster.positions && cluster.positions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <div className="text-xs font-medium text-slate-600 mb-1">Positions:</div>
                              <ul className="space-y-1">
                                {cluster.positions.map((position, idx) => (
                                  <li key={idx} className="text-xs text-slate-600 pl-2 border-l-2 border-blue-300">
                                    {position.length > 200 ? `${position.slice(0, 200)}...` : position}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoundEvolution({ rounds, convergenceMetrics }: RoundEvolutionProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No round data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Convergence Overview */}
      {convergenceMetrics && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Convergence Analysis</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <MetricBar 
                label="Position Stability" 
                value={convergenceMetrics.position_stability} 
                color={convergenceMetrics.position_stability > 0.7 ? "green" : "amber"}
              />
              <MetricBar 
                label="Consensus Clarity" 
                value={convergenceMetrics.consensus_clarity}
                color={convergenceMetrics.consensus_clarity > 0.7 ? "green" : "amber"}
              />
            </div>
            <div className="space-y-4">
              <MetricBar 
                label="Citation Overlap" 
                value={convergenceMetrics.citation_overlap}
                color="blue"
              />
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Confidence Spread</span>
                  <span className="font-medium text-slate-900">{convergenceMetrics.confidence_spread.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      convergenceMetrics.confidence_spread < 1.5 ? "bg-green-500" : "bg-amber-500"
                    )}
                    style={{ width: `${Math.min(convergenceMetrics.confidence_spread * 20, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Completed <span className="font-semibold text-slate-900">{convergenceMetrics.rounds_completed}</span> rounds
            </div>
            <div className={cn(
              "text-sm px-3 py-1 rounded-full font-medium",
              convergenceMetrics.termination_reason === "consensus_reached" 
                ? "bg-green-100 text-green-700"
                : convergenceMetrics.termination_reason === "divergence_stable"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-700"
            )}>
              {convergenceMetrics.termination_reason.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      )}

      {/* Round Timeline */}
      <div className="space-y-0">
        <h3 className="font-semibold text-slate-900 mb-4">Round Timeline</h3>
        {rounds.map((round, index) => (
          <RoundCard 
            key={round.round_number} 
            round={round} 
            isLast={index === rounds.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
