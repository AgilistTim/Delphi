import { ExpertResponse, RoundSynthesis, ConvergenceMetrics, Citation } from '../types/index.js';

export class ConvergenceTracker {
  private roundHistory: RoundSynthesis[] = [];
  private expertHistories: Map<string, ExpertResponse[]> = new Map();

  /**
   * Add a round's results to the tracker
   */
  addRound(synthesis: RoundSynthesis, expertResponses: ExpertResponse[]): void {
    this.roundHistory.push(synthesis);
    
    // Track individual expert evolution
    expertResponses.forEach(response => {
      if (!this.expertHistories.has(response.agent_id)) {
        this.expertHistories.set(response.agent_id, []);
      }
      this.expertHistories.get(response.agent_id)!.push(response);
    });
  }

  /**
   * Calculate convergence metrics for the current state
   */
  calculateMetrics(): ConvergenceMetrics {
    if (this.roundHistory.length === 0) {
      throw new Error('No rounds to analyze');
    }
    const positionStability = this.calculatePositionStability();
    const confidenceSpread = this.calculateConfidenceSpread();
    const consensusClarity = this.calculateConsensusClarity();
    const citationOverlap = this.calculateCitationOverlap();
    const terminationReason = this.determineTerminationReason();

    return {
      position_stability: positionStability,
      confidence_spread: confidenceSpread,
      consensus_clarity: consensusClarity,
      citation_overlap: citationOverlap,
      rounds_completed: this.roundHistory.length,
      termination_reason: terminationReason
    };
  }

  /**
   * Calculate how stable expert positions are (0-1, where 1 = no changes)
   */
  private calculatePositionStability(): number {
    if (this.roundHistory.length < 2) {
      return 1.0; // Only one round, perfect stability
    }

    let totalExperts = 0;
    let stableExperts = 0;

    this.expertHistories.forEach((history) => {
      if (history.length >= 2) {
        totalExperts++;
        
        // Compare last two positions using semantic similarity
        const lastPosition = history[history.length - 1].position.toLowerCase();
        const previousPosition = history[history.length - 2].position.toLowerCase();
        
        // Simple similarity check - count overlapping key terms
        const lastWords = new Set(lastPosition.split(/\s+/).filter(word => word.length > 3));
        const previousWords = new Set(previousPosition.split(/\s+/).filter(word => word.length > 3));
        
        const overlap = new Set([...lastWords].filter(word => previousWords.has(word)));
        const similarity = overlap.size / Math.max(lastWords.size, previousWords.size);
        
        if (similarity > 0.7) { // 70% similarity threshold
          stableExperts++;
        }
      }
    });

    return totalExperts > 0 ? stableExperts / totalExperts : 1.0;
  }

  /**
   * Calculate spread of confidence scores (lower = more consensus)
   */
  private calculateConfidenceSpread(): number {
    if (this.roundHistory.length === 0) return 0;

    const currentRound = this.roundHistory[this.roundHistory.length - 1];
    
    // Get confidence scores from all clusters
    const confidenceScores: number[] = [];
    currentRound.clusters.forEach(cluster => {
      // Use average of confidence range
      const avgConfidence = (cluster.confidence_range[0] + cluster.confidence_range[1]) / 2;
      confidenceScores.push(avgConfidence);
    });

    if (confidenceScores.length === 0) return 0;

    // Calculate standard deviation
    const mean = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    const variance = confidenceScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / confidenceScores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate how clear the consensus is (0-1, where 1 = very clear)
   */
  private calculateConsensusClarity(): number {
    if (this.roundHistory.length === 0) return 0;

    const currentRound = this.roundHistory[this.roundHistory.length - 1];
    
    // Clarity is based on:
    // 1. How many consensus areas vs divergence areas
    // 2. How dominant the largest cluster is
    // 3. Average confidence level

    const consensusRatio = currentRound.consensus_areas.length / 
      Math.max(1, currentRound.consensus_areas.length + currentRound.divergence_areas.length);

    // Find the largest cluster
    let maxClusterSize = 0;
    if (currentRound.clusters.length > 0) {
      maxClusterSize = Math.max(...currentRound.clusters.map(cluster => cluster.expert_ids.length));
    }
    const dominanceRatio = maxClusterSize / Math.max(1, currentRound.participation_count);

    // Normalize average confidence to 0-1 scale
    const confidenceRatio = currentRound.average_confidence / 10;

    // Weight the factors
    return (consensusRatio * 0.4) + (dominanceRatio * 0.3) + (confidenceRatio * 0.3);
  }

  /**
   * Calculate citation overlap between experts (0-1, where 1 = all using same sources)
   */
  private calculateCitationOverlap(): number {
    if (this.expertHistories.size === 0) return 0;

         // Get all citations from the latest round
    const allCitations: Citation[] = [];
    const expertCitations: Citation[][] = [];

    this.expertHistories.forEach((history) => {
      if (history.length > 0) {
        const latestResponse = history[history.length - 1];
        // Convert sources to proper Citation format
        const citations: Citation[] = latestResponse.sources.map(source => ({
          title: source.title,
          url: source.url,
          date: source.date || undefined,
          relevance: source.relevance || undefined
        }));
        expertCitations.push(citations);
        allCitations.push(...citations);
      }
    });

    if (expertCitations.length < 2) return 1.0;

    // Create a map of URL -> experts using it
    const urlUsage = new Map<string, Set<number>>();
    expertCitations.forEach((citations, expertIndex) => {
      citations.forEach(citation => {
        if (!urlUsage.has(citation.url)) {
          urlUsage.set(citation.url, new Set());
        }
        urlUsage.get(citation.url)!.add(expertIndex);
      });
    });

    // Calculate overlap score
    let totalPossiblePairs = 0;
    let overlappingPairs = 0;

    for (let i = 0; i < expertCitations.length; i++) {
      for (let j = i + 1; j < expertCitations.length; j++) {
        totalPossiblePairs++;
        
        const expertI = new Set(expertCitations[i].map(c => c.url));
        const expertJ = new Set(expertCitations[j].map(c => c.url));
        
        const overlap = new Set([...expertI].filter(url => expertJ.has(url)));
        if (overlap.size > 0) {
          overlappingPairs++;
        }
      }
    }

    return totalPossiblePairs > 0 ? overlappingPairs / totalPossiblePairs : 0;
  }

  /**
   * Determine why the process should/did terminate
   */
  private determineTerminationReason(): 'consensus_reached' | 'max_rounds' | 'divergence_stable' {
    const metrics = {
      position_stability: this.calculatePositionStability(),
      consensus_clarity: this.calculateConsensusClarity(),
      confidence_spread: this.calculateConfidenceSpread()
    };

    // Check for consensus
    if (metrics.consensus_clarity > 0.8 && metrics.position_stability > 0.8 && metrics.confidence_spread < 1.5) {
      return 'consensus_reached';
    }

    // Check for stable divergence (positions not changing but no consensus)
    if (metrics.position_stability > 0.9 && metrics.consensus_clarity < 0.5) {
      return 'divergence_stable';
    }

    // Default: max rounds (will be overridden if process continues)
    return 'max_rounds';
  }

  /**
   * Check if convergence has been reached
   */
  hasConverged(): boolean {
    if (this.roundHistory.length < 2) return false;
    
    const metrics = this.calculateMetrics();
    
    // Convergence criteria:
    // - High position stability (>80%)
    // - High consensus clarity (>75%)
    // - Low confidence spread (<2.0)
    
    return metrics.position_stability > 0.8 && 
           metrics.consensus_clarity > 0.75 && 
           metrics.confidence_spread < 2.0;
  }

  /**
   * Check if process should terminate due to stable divergence
   */
  hasStableDivergence(): boolean {
    if (this.roundHistory.length < 2) return false;
    
    const metrics = this.calculateMetrics();
    
    // Stable divergence criteria:
    // - Very high position stability (positions not changing)
    // - Low consensus clarity (no emerging consensus)
    
    return metrics.position_stability > 0.9 && 
           metrics.consensus_clarity < 0.4;
  }

  /**
   * Get the full round history
   */
  getRoundHistory(): RoundSynthesis[] {
    return [...this.roundHistory];
  }

  /**
   * Get expert evolution data
   */
  getExpertEvolution(): Map<string, ExpertResponse[]> {
    return new Map(this.expertHistories);
  }
} 