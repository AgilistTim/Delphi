"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import type { 
  RoundResult, 
  RoundSynthesis, 
  ExpertResponse, 
  ContrarianResponse 
} from "../lib/reports";

interface RoundEvolutionProps {
  rounds: RoundSynthesis[];
  roundResults?: RoundResult[];
  convergenceMetrics?: {
    position_stability: number;
    consensus_clarity: number;
    confidence_spread: number;
    citation_overlap: number;
    disagreement_index?: number;
    minority_persistence?: number;
    rounds_completed: number;
    termination_reason: string;
  };
  expertPersonas?: Array<{
    name: string;
    role: string;
    agent_id?: string;
  }>;
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

function TrendChart({ 
  data, 
  label, 
  color = "#3b82f6",
  height = 60 
}: { 
  data: number[]; 
  label: string;
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 200;
  const padding = 10;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-600">{label}</div>
      <svg width={width} height={height} className="bg-slate-50 rounded">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
        {data.map((value, index) => {
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((value - min) / range) * (height - 2 * padding);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
            />
          );
        })}
        <text x={padding} y={height - 2} fontSize="10" fill="#64748b">R1</text>
        <text x={width - padding - 10} y={height - 2} fontSize="10" fill="#64748b">R{data.length}</text>
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{data[0]?.toFixed(1)}</span>
        <span>{data[data.length - 1]?.toFixed(1)}</span>
      </div>
    </div>
  );
}

function Accordion({ 
  title, 
  children, 
  defaultOpen = false,
  badge,
  variant = "default"
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  variant?: "default" | "expert" | "contrarian";
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  const variantStyles = {
    default: "border-slate-200 bg-white",
    expert: "border-blue-200 bg-blue-50/50",
    contrarian: "border-amber-200 bg-amber-50/50"
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", variantStyles[variant])}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{title}</span>
          {badge}
        </div>
        <svg 
          className={cn("w-5 h-5 text-slate-400 transition-transform", isOpen && "rotate-180")}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function ExpertResponseCard({ 
  response, 
  expertName 
}: { 
  response: ExpertResponse;
  expertName?: string;
}) {
  const displayName = expertName || response.expertise_area || response.agent_id || "Expert";
  
  return (
    <Accordion 
      title={displayName}
      badge={
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
          {response.confidence}/10 confidence
        </span>
      }
      variant="expert"
    >
      <div className="space-y-4 pt-3">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Position</div>
          <p className="text-sm text-slate-700">{response.position}</p>
        </div>
        
        {response.reasoning && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reasoning</div>
            <p className="text-sm text-slate-600">{response.reasoning}</p>
          </div>
        )}
        
        {response.research_reasoning && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Research-Based Reasoning</div>
            <p className="text-sm text-slate-600">{response.research_reasoning}</p>
          </div>
        )}
        
        {response.experience_reasoning && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Experience-Based Reasoning</div>
            <p className="text-sm text-slate-600">{response.experience_reasoning}</p>
          </div>
        )}
        
        {response.falsifiability && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">What Would Change My Mind</div>
            <p className="text-sm text-slate-600">{response.falsifiability}</p>
          </div>
        )}
        
        {response.strongest_counter_argument && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Strongest Counter-Argument</div>
            <p className="text-sm text-slate-600">{response.strongest_counter_argument}</p>
          </div>
        )}
        
        {response.conditional_factors && response.conditional_factors.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Conditional Factors</div>
            <ul className="text-sm text-slate-600 list-disc list-inside">
              {response.conditional_factors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
        
        {response.justification_basis && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Justification basis:</span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
              {response.justification_basis.replace(/_/g, " ")}
            </span>
          </div>
        )}
        
        {response.sources && response.sources.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Sources ({response.sources.length})</div>
            <ul className="text-xs text-slate-600 space-y-1">
              {response.sources.slice(0, 3).map((source, i) => (
                <li key={i} className="truncate">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.title}
                  </a>
                </li>
              ))}
              {response.sources.length > 3 && (
                <li className="text-slate-400">+{response.sources.length - 3} more sources</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Accordion>
  );
}

function ContrarianResponseCard({ response }: { response: ContrarianResponse }) {
  return (
    <Accordion 
      title="Contrarian Challenge"
      badge={
        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
          {response.blind_spots?.length || 0} blind spots
        </span>
      }
      variant="contrarian"
    >
      <div className="space-y-4 pt-3">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Critique</div>
          <p className="text-sm text-slate-700">{response.critique}</p>
        </div>
        
        {response.alternative_framework && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Alternative Framework</div>
            <p className="text-sm text-slate-600">{response.alternative_framework}</p>
          </div>
        )}
        
        {response.blind_spots && response.blind_spots.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Blind Spots Identified</div>
            <ul className="text-sm text-slate-600 list-disc list-inside">
              {response.blind_spots.map((spot, i) => (
                <li key={i}>{spot}</li>
              ))}
            </ul>
          </div>
        )}
        
        {response.counter_evidence && response.counter_evidence.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Counter Evidence</div>
            <ul className="text-xs text-slate-600 space-y-1">
              {response.counter_evidence.map((evidence, i) => (
                <li key={i}>
                  <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    {evidence.title}
                  </a>
                  {evidence.summary && <span className="text-slate-500"> - {evidence.summary}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Accordion>
  );
}

function RoundCard({ 
  round, 
  roundResult,
  isLast,
  expertPersonas
}: { 
  round: RoundSynthesis; 
  roundResult?: RoundResult;
  isLast: boolean;
  expertPersonas?: Array<{ name: string; role: string; agent_id?: string }>;
}) {
  const getExpertName = (agentId?: string) => {
    if (!agentId || !expertPersonas) return undefined;
    const persona = expertPersonas.find(p => p.agent_id === agentId);
    return persona?.name;
  };
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
                  <Accordion title={`Expert Clusters (${round.clusters.length})`}>
                    <div className="space-y-3 pt-2">
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
                  </Accordion>
                )}

                {/* Expert Responses - Verbatim */}
                {roundResult && roundResult.expert_responses && roundResult.expert_responses.length > 0 && (
                  <Accordion title={`Expert Responses (${roundResult.expert_responses.length})`}>
                    <div className="space-y-3 pt-2">
                      {roundResult.expert_responses.map((response, i) => (
                        <ExpertResponseCard 
                          key={i} 
                          response={response}
                          expertName={getExpertName(response.agent_id)}
                        />
                      ))}
                    </div>
                  </Accordion>
                )}

                {/* Contrarian Challenges */}
                {roundResult && roundResult.contrarian_responses && roundResult.contrarian_responses.length > 0 && (
                  <Accordion title={`Contrarian Challenges (${roundResult.contrarian_responses.length})`}>
                    <div className="space-y-3 pt-2">
                      {roundResult.contrarian_responses.map((response, i) => (
                        <ContrarianResponseCard key={i} response={response} />
                      ))}
                    </div>
                  </Accordion>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoundEvolution({ 
  rounds, 
  roundResults,
  convergenceMetrics,
  expertPersonas 
}: RoundEvolutionProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No round data available.
      </div>
    );
  }

  const confidenceTrend = rounds.map(r => r.average_confidence);
  const clusterTrend = rounds.map(r => r.clusters?.length || 0);
  const consensusTrend = rounds.map(r => r.consensus_areas.length);
  const divergenceTrend = rounds.map(r => r.divergence_areas.length);

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
              {convergenceMetrics.disagreement_index !== undefined && (
                <MetricBar 
                  label="Disagreement Index" 
                  value={convergenceMetrics.disagreement_index}
                  color={convergenceMetrics.disagreement_index < 0.3 ? "green" : "amber"}
                />
              )}
            </div>
            <div className="space-y-4">
              <MetricBar 
                label="Citation Overlap" 
                value={convergenceMetrics.citation_overlap}
                color="blue"
              />
              {convergenceMetrics.minority_persistence !== undefined && (
                <MetricBar 
                  label="Minority Persistence" 
                  value={convergenceMetrics.minority_persistence}
                  color={convergenceMetrics.minority_persistence > 0.5 ? "amber" : "green"}
                />
              )}
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

      {/* Trend Analysis */}
      {rounds.length >= 2 && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Trend Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrendChart 
              data={confidenceTrend} 
              label="Avg Confidence" 
              color="#22c55e"
            />
            <TrendChart 
              data={clusterTrend} 
              label="Clusters" 
              color="#8b5cf6"
            />
            <TrendChart 
              data={consensusTrend} 
              label="Consensus Areas" 
              color="#10b981"
            />
            <TrendChart 
              data={divergenceTrend} 
              label="Divergence Areas" 
              color="#f59e0b"
            />
          </div>
        </div>
      )}

      {/* Round Timeline */}
      <div className="space-y-0">
        <h3 className="font-semibold text-slate-900 mb-4">Round Timeline</h3>
        {rounds.map((round, index) => {
          const matchingRoundResult = roundResults?.find(
            rr => rr.round_number === round.round_number
          );
          return (
            <RoundCard 
              key={round.round_number} 
              round={round}
              roundResult={matchingRoundResult}
              isLast={index === rounds.length - 1}
              expertPersonas={expertPersonas}
            />
          );
        })}
      </div>
    </div>
  );
}
