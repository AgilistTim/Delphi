import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#475569',
  },
  questionBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  contextText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
  },
  consensusBox: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  consensusText: {
    fontSize: 11,
    color: '#065f46',
    lineHeight: 1.5,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f8fafc',
    marginRight: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  expertCard: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  expertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  expertName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  expertRole: {
    fontSize: 10,
    color: '#6366f1',
    marginBottom: 4,
  },
  expertDemographics: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 6,
  },
  expertPosition: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  expertDetailSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  expertDetailLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 2,
  },
  expertDetailText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  listItem: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 8,
    marginBottom: 2,
  },
  confidenceBadge: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 'bold',
  },
  roundCard: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roundTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  roundMetrics: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  roundMetric: {
    marginRight: 16,
  },
  roundMetricLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  roundMetricValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
  },
  areaBox: {
    marginBottom: 8,
  },
  areaTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  areaItem: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  sourceCard: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  sourceTitle: {
    fontSize: 10,
    color: '#3b82f6',
    marginBottom: 2,
  },
  sourceUrl: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  sourceRelevance: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
  },
  sourceCitedBy: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
  noDataText: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});

interface Source {
  title: string;
  url: string;
  relevance?: string;
}

interface ExpertPosition {
  position: string;
  reasoning: string;
  confidence: number;
  sources: Source[];
  expertise_area?: string;
  agent_id?: string;
}

interface ExpertPersona {
  name: string;
  role: string;
  domain_expertise: string;
  perspective: string;
  work_background: string;
  education_history: string;
  justification?: string;
  description: string;
  age?: number;
  gender?: string;
  nationality?: string;
  location?: string;
  years_experience?: number;
  organization_type?: string;
  notable_achievements?: string[];
  potential_biases?: string[];
  communication_style?: string;
  agent_id?: string;
}

interface RoundSynthesis {
  round_number: number;
  clusters?: Array<{ theme: string; members: string[] }>;
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  participation_count: number;
  key_insights: string[];
}

interface ContrarianObservation {
  challenge: string;
  counter_evidence?: Source[];
  validity_assessment?: string;
}

interface DissentingView {
  position: string;
  expert_ids?: string[];
  reasoning?: string;
  sources?: Source[];
}

interface DelphiReportData {
  prompt?: {
    question?: string;
    context?: string;
  };
  generated_at?: string;
  consensus_summary?: {
    final_position?: string;
    support_level?: string;
    confidence_level?: number;
    key_evidence?: Source[];
  };
  convergence_analysis?: {
    rounds_completed?: number;
    position_stability?: number;
    consensus_clarity?: number;
    termination_reason?: string;
  };
  expert_positions?: ExpertPosition[];
  expert_personas?: ExpertPersona[];
  round_history?: RoundSynthesis[];
  contrarian_observations?: ContrarianObservation[];
  dissenting_views?: (string | DissentingView)[];
}

interface DelphiReportPDFProps {
  report: DelphiReportData;
}

interface CollectedSource extends Source {
  citedBy: string[];
}

function collectAllSources(report: DelphiReportData): CollectedSource[] {
  const sourceMap = new Map<string, CollectedSource>();
  
  report.expert_positions?.forEach((expert) => {
    const expertName = expert.expertise_area || 'Unknown Expert';
    expert.sources?.forEach((source) => {
      const key = source.url?.toLowerCase() || source.title?.toLowerCase();
      if (key) {
        const existing = sourceMap.get(key);
        if (existing) {
          if (!existing.citedBy.includes(expertName)) {
            existing.citedBy.push(expertName);
          }
        } else {
          sourceMap.set(key, {
            ...source,
            citedBy: [expertName],
          });
        }
      }
    });
  });
  
  report.consensus_summary?.key_evidence?.forEach((source) => {
    const key = source.url?.toLowerCase() || source.title?.toLowerCase();
    if (key) {
      const existing = sourceMap.get(key);
      if (existing) {
        if (!existing.citedBy.includes('Consensus Summary')) {
          existing.citedBy.push('Consensus Summary');
        }
      } else {
        sourceMap.set(key, {
          ...source,
          citedBy: ['Consensus Summary'],
        });
      }
    }
  });
  
  report.contrarian_observations?.forEach((obs, idx) => {
    obs.counter_evidence?.forEach((source) => {
      const key = source.url?.toLowerCase() || source.title?.toLowerCase();
      if (key) {
        const existing = sourceMap.get(key);
        if (existing) {
          if (!existing.citedBy.includes(`Contrarian ${idx + 1}`)) {
            existing.citedBy.push(`Contrarian ${idx + 1}`);
          }
        } else {
          sourceMap.set(key, {
            ...source,
            citedBy: [`Contrarian ${idx + 1}`],
          });
        }
      }
    });
  });
  
  return Array.from(sourceMap.values());
}

export default function DelphiReportPDF({ report }: DelphiReportPDFProps) {
  const genAt = report.generated_at 
    ? new Date(report.generated_at).toLocaleString()
    : 'Unknown';

  const getPersonaForExpert = (expertPosition: ExpertPosition): ExpertPersona | undefined => {
    if (!report.expert_personas) return undefined;
    return report.expert_personas.find(p => p.agent_id === expertPosition.agent_id) 
      || report.expert_personas.find(p => p.role === expertPosition.expertise_area);
  };

  const allSources = collectAllSources(report);
  const hasPersonas = report.expert_personas && report.expert_personas.length > 0;
  const hasRoundHistory = report.round_history && report.round_history.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Delphi Analysis Report</Text>
          <Text style={styles.subtitle}>Generated: {genAt}</Text>
          <Text style={styles.subtitle}>
            {report.convergence_analysis?.rounds_completed || 0} rounds completed | {report.expert_positions?.length || 0} experts consulted
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research Question</Text>
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{report.prompt?.question || 'No question provided'}</Text>
            {report.prompt?.context && (
              <Text style={styles.contextText}>Context: {report.prompt.context}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consensus Summary</Text>
          <View style={styles.consensusBox}>
            <Text style={styles.consensusText}>
              {report.consensus_summary?.final_position || 'No consensus reached'}
            </Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Support Level</Text>
              <Text style={styles.metricValue}>{report.consensus_summary?.support_level || 'N/A'}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={styles.metricValue}>
                {typeof report.consensus_summary?.confidence_level === 'number' 
                  ? `${report.consensus_summary.confidence_level.toFixed(1)}/10` 
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Position Stability</Text>
              <Text style={styles.metricValue}>
                {typeof report.convergence_analysis?.position_stability === 'number'
                  ? `${(report.convergence_analysis.position_stability * 100).toFixed(0)}%`
                  : 'N/A'}
              </Text>
            </View>
            <View style={{...styles.metricItem, marginRight: 0}}>
              <Text style={styles.metricLabel}>Termination</Text>
              <Text style={styles.metricValue}>
                {report.convergence_analysis?.termination_reason?.replace(/_/g, ' ') || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {report.dissenting_views && report.dissenting_views.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dissenting Views</Text>
            {report.dissenting_views.map((view, i) => {
              if (typeof view === 'string') {
                return <Text key={i} style={styles.areaItem}>• {view}</Text>;
              }
              return (
                <View key={i} style={{marginBottom: 8, padding: 8, backgroundColor: '#fef3c7', borderRadius: 4}}>
                  <Text style={{fontSize: 10, color: '#92400e', lineHeight: 1.4}}>{view.position}</Text>
                  {view.reasoning && (
                    <Text style={{fontSize: 9, color: '#78350f', marginTop: 4, lineHeight: 1.4}}>
                      Reasoning: {view.reasoning}
                    </Text>
                  )}
                  {view.sources && view.sources.length > 0 && (
                    <View style={{marginTop: 4}}>
                      <Text style={{fontSize: 8, color: '#92400e'}}>Sources:</Text>
                      {view.sources.map((source, idx) => (
                        <Link key={idx} src={source.url || ''} style={{fontSize: 8, color: '#3b82f6', marginLeft: 8}}>
                          {source.title || source.url || 'Untitled'}
                        </Link>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>Delphi Consensus Analysis</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>

      {report.expert_positions && report.expert_positions.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expert Panel - Detailed Profiles</Text>
            {!hasPersonas && (
              <Text style={styles.noDataText}>
                Note: Detailed persona information is not available for this report. Only position data is shown.
              </Text>
            )}
          </View>
          
          {report.expert_positions.map((expert, i) => {
            const persona = getPersonaForExpert(expert);
            return (
              <View key={i} style={styles.expertCard}>
                <View style={styles.expertHeader}>
                  <View style={{flex: 1}}>
                    {persona && <Text style={styles.expertName}>{persona.name}</Text>}
                    <Text style={styles.expertRole}>{expert.expertise_area || `Expert ${i + 1}`}</Text>
                    <Text style={{fontSize: 8, color: '#94a3b8', fontStyle: 'italic', marginTop: 2}}>AI-Generated Persona</Text>
                    {persona && (
                      <Text style={styles.expertDemographics}>
                        {[
                          persona.age && `${persona.age} years old`,
                          persona.gender,
                          persona.nationality,
                          persona.location && `Based in ${persona.location}`,
                          persona.years_experience && `${persona.years_experience} years experience`,
                          persona.organization_type,
                        ].filter(Boolean).join(' | ')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.confidenceBadge}>{expert.confidence}/10</Text>
                </View>
                
                <View style={{marginBottom: 8}}>
                  <Text style={styles.expertDetailLabel}>Position:</Text>
                  <Text style={styles.expertPosition}>{expert.position}</Text>
                </View>

                {expert.reasoning && (
                  <View style={{marginBottom: 8}}>
                    <Text style={styles.expertDetailLabel}>Reasoning:</Text>
                    <Text style={styles.expertDetailText}>{expert.reasoning}</Text>
                  </View>
                )}
                
                {persona && (
                  <View style={styles.expertDetailSection}>
                    {persona.description && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Profile:</Text>
                        <Text style={styles.expertDetailText}>{persona.description}</Text>
                      </View>
                    )}
                    
                    {persona.work_background && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Work Background:</Text>
                        <Text style={styles.expertDetailText}>{persona.work_background}</Text>
                      </View>
                    )}
                    
                    {persona.education_history && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Education:</Text>
                        <Text style={styles.expertDetailText}>{persona.education_history}</Text>
                      </View>
                    )}
                    
                    {persona.domain_expertise && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Domain Expertise:</Text>
                        <Text style={styles.expertDetailText}>{persona.domain_expertise}</Text>
                      </View>
                    )}
                    
                    {persona.perspective && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Perspective:</Text>
                        <Text style={styles.expertDetailText}>{persona.perspective}</Text>
                      </View>
                    )}
                    
                    {persona.notable_achievements && persona.notable_achievements.length > 0 && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Notable Achievements:</Text>
                        {persona.notable_achievements.map((achievement, idx) => (
                          <Text key={idx} style={styles.listItem}>• {achievement}</Text>
                        ))}
                      </View>
                    )}
                    
                    {persona.potential_biases && persona.potential_biases.length > 0 && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Potential Biases:</Text>
                        {persona.potential_biases.map((bias, idx) => (
                          <Text key={idx} style={styles.listItem}>• {bias}</Text>
                        ))}
                      </View>
                    )}
                    
                    {persona.communication_style && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Communication Style:</Text>
                        <Text style={styles.expertDetailText}>{persona.communication_style}</Text>
                      </View>
                    )}

                    {persona.justification && (
                      <View style={{marginBottom: 6}}>
                        <Text style={styles.expertDetailLabel}>Selection Justification:</Text>
                        <Text style={styles.expertDetailText}>{persona.justification}</Text>
                      </View>
                    )}
                  </View>
                )}
                
                {expert.sources && expert.sources.length > 0 && (
                  <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0'}}>
                    <Text style={styles.expertDetailLabel}>Sources Cited ({expert.sources.length}):</Text>
                    {expert.sources.map((source, idx) => (
                      <View key={idx} style={{marginLeft: 8, marginBottom: 4}}>
                        <Link src={source.url || ''} style={{fontSize: 9, color: '#3b82f6'}}>
                          {source.title || source.url || 'Untitled'}
                        </Link>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </Page>
      )}

      {hasRoundHistory && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Round Evolution - Convergence and Divergence</Text>
            <Text style={styles.expertDetailText}>
              This section shows how expert opinions evolved across rounds, tracking areas of agreement (convergence) and disagreement (divergence).
            </Text>
          </View>
          
          {report.round_history!.map((round, i) => (
            <View key={i} style={styles.roundCard}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round {round.round_number}</Text>
              </View>
              
              <View style={styles.roundMetrics}>
                <View style={styles.roundMetric}>
                  <Text style={styles.roundMetricLabel}>Avg Confidence</Text>
                  <Text style={styles.roundMetricValue}>{round.average_confidence}/10</Text>
                </View>
                <View style={styles.roundMetric}>
                  <Text style={styles.roundMetricLabel}>Participation</Text>
                  <Text style={styles.roundMetricValue}>{round.participation_count} experts</Text>
                </View>
                {round.clusters && round.clusters.length > 0 && (
                  <View style={styles.roundMetric}>
                    <Text style={styles.roundMetricLabel}>Opinion Clusters</Text>
                    <Text style={styles.roundMetricValue}>{round.clusters.length}</Text>
                  </View>
                )}
              </View>
              
              {round.consensus_areas && round.consensus_areas.length > 0 && (
                <View style={styles.areaBox}>
                  <Text style={styles.areaTitle}>Areas of Convergence:</Text>
                  {round.consensus_areas.map((area, idx) => (
                    <Text key={idx} style={styles.areaItem}>• {area}</Text>
                  ))}
                </View>
              )}
              
              {round.divergence_areas && round.divergence_areas.length > 0 && (
                <View style={styles.areaBox}>
                  <Text style={styles.areaTitle}>Areas of Divergence:</Text>
                  {round.divergence_areas.map((area, idx) => (
                    <Text key={idx} style={styles.areaItem}>• {area}</Text>
                  ))}
                </View>
              )}
              
              {round.key_insights && round.key_insights.length > 0 && (
                <View style={styles.areaBox}>
                  <Text style={styles.areaTitle}>Key Insights:</Text>
                  {round.key_insights.map((insight, idx) => (
                    <Text key={idx} style={styles.areaItem}>• {insight}</Text>
                  ))}
                </View>
              )}

              {round.clusters && round.clusters.length > 0 && (
                <View style={styles.areaBox}>
                  <Text style={styles.areaTitle}>Opinion Clusters:</Text>
                  {round.clusters.map((cluster, idx) => (
                    <View key={idx} style={{marginLeft: 8, marginBottom: 4}}>
                      <Text style={{fontSize: 9, fontWeight: 'bold', color: '#475569'}}>{cluster.theme}</Text>
                      <Text style={{fontSize: 8, color: '#64748b', marginLeft: 8}}>
                        Members: {cluster.members?.join(', ') || 'N/A'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </Page>
      )}

      {report.contrarian_observations && report.contrarian_observations.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contrarian Analysis</Text>
            <Text style={styles.expertDetailText}>
              The contrarian agent challenges assumptions and surfaces counterpoints to ensure robust analysis.
            </Text>
          </View>
          
          {report.contrarian_observations.map((obs, i) => (
            <View key={i} style={{...styles.roundCard, borderLeftColor: '#ef4444'}}>
              <Text style={styles.roundTitle}>Challenge {i + 1}</Text>
              <Text style={{...styles.expertDetailText, marginTop: 6}}>{obs.challenge}</Text>
              
              {obs.validity_assessment && (
                <View style={{marginTop: 6}}>
                  <Text style={styles.expertDetailLabel}>Validity Assessment:</Text>
                  <Text style={styles.expertDetailText}>{obs.validity_assessment}</Text>
                </View>
              )}
              
              {obs.counter_evidence && obs.counter_evidence.length > 0 && (
                <View style={{marginTop: 6}}>
                  <Text style={styles.expertDetailLabel}>Counter Evidence:</Text>
                  {obs.counter_evidence.map((source, idx) => (
                    <View key={idx} style={{marginLeft: 8, marginBottom: 2}}>
                      <Link src={source.url || ''} style={{fontSize: 9, color: '#3b82f6'}}>
                        {source.title || source.url || 'Untitled'}
                      </Link>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </Page>
      )}

      {allSources.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Complete Evidence Bibliography</Text>
            <Text style={styles.expertDetailText}>
              All sources cited across the analysis, deduplicated and showing which experts referenced each source.
              Total unique sources: {allSources.length}
            </Text>
          </View>
          
          {allSources.map((source, i) => (
            <View key={i} style={styles.sourceCard}>
              <Link src={source.url || ''} style={styles.sourceTitle}>
                {source.title || 'Untitled Source'}
              </Link>
              <Text style={styles.sourceUrl}>{source.url || ''}</Text>
              {source.relevance && (
                <Text style={styles.sourceRelevance}>{source.relevance}</Text>
              )}
              <Text style={styles.sourceCitedBy}>
                Cited by: {source.citedBy.join(', ')}
              </Text>
            </View>
          ))}
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  );
}
