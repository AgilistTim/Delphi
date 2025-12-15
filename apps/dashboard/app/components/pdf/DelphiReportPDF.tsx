import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  questionBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  expertCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  expertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expertName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  expertRole: {
    fontSize: 11,
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
  expertBackground: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confidenceBadge: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 'bold',
  },
  sourcesList: {
    marginTop: 8,
  },
  sourceItem: {
    fontSize: 9,
    color: '#3b82f6',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94a3b8',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: '#94a3b8',
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
}

interface DelphiReportPDFProps {
  report: DelphiReportData;
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Delphi Analysis Report</Text>
          <Text style={styles.subtitle}>Generated: {genAt}</Text>
          <Text style={styles.subtitle}>
            {report.convergence_analysis?.rounds_completed || 0} rounds | {report.expert_positions?.length || 0} experts
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research Question</Text>
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{report.prompt?.question || 'No question'}</Text>
            {report.prompt?.context && (
              <Text style={styles.contextText}>{report.prompt.context}</Text>
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
            <View style={{...styles.metricItem, marginRight: 0}}>
              <Text style={styles.metricLabel}>Termination</Text>
              <Text style={styles.metricValue}>
                {report.convergence_analysis?.termination_reason?.replace(/_/g, ' ') || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Delphi Consensus Analysis</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {report.expert_positions && report.expert_positions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expert Panel</Text>
            {report.expert_positions.map((expert, i) => {
              const persona = getPersonaForExpert(expert);
              return (
                <View key={i} style={styles.expertCard} wrap={false}>
                  <View style={styles.expertHeader}>
                    <View>
                      {persona && <Text style={styles.expertName}>{persona.name}</Text>}
                      <Text style={styles.expertRole}>{expert.expertise_area || `Expert ${i + 1}`}</Text>
                      {persona && (
                        <Text style={styles.expertDemographics}>
                          {[
                            persona.age && `${persona.age} years old`,
                            persona.gender,
                            persona.nationality,
                            persona.location && `Based in ${persona.location}`,
                            persona.years_experience && `${persona.years_experience} years experience`,
                          ].filter(Boolean).join(' | ')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.confidenceBadge}>{expert.confidence}/10</Text>
                  </View>
                  
                  <Text style={styles.expertPosition}>{expert.position}</Text>
                  
                  {persona && (
                    <View style={styles.expertBackground}>
                      {persona.education_history && (
                        <Text style={{marginBottom: 4}}>Education: {persona.education_history}</Text>
                      )}
                      {persona.organization_type && (
                        <Text style={{marginBottom: 4}}>Organization: {persona.organization_type}</Text>
                      )}
                      {persona.communication_style && (
                        <Text>Style: {persona.communication_style}</Text>
                      )}
                    </View>
                  )}
                  
                  {expert.sources && expert.sources.length > 0 && (
                    <View style={styles.sourcesList}>
                      <Text style={{fontSize: 9, color: '#64748b', marginBottom: 4}}>Sources:</Text>
                      {expert.sources.slice(0, 3).map((source, idx) => (
                        <Link key={idx} src={source.url} style={styles.sourceItem}>
                          {source.title || source.url}
                        </Link>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {report.consensus_summary?.key_evidence && report.consensus_summary.key_evidence.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Evidence</Text>
            {report.consensus_summary.key_evidence.map((evidence, i) => (
              <View key={i} style={{marginBottom: 8, padding: 8, backgroundColor: '#f8fafc', borderRadius: 4}}>
                <Link src={evidence.url} style={{fontSize: 11, color: '#3b82f6', marginBottom: 4}}>
                  {evidence.title || evidence.url}
                </Link>
                {evidence.relevance && (
                  <Text style={{fontSize: 9, color: '#64748b'}}>{evidence.relevance}</Text>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.footer}>Delphi Consensus Analysis</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
    </Document>
  );
}
