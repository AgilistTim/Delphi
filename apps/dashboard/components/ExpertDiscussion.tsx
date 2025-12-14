"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "../lib/utils";

interface ExpertPosition {
  position: string;
  reasoning: string;
  confidence: number;
  sources: Array<{ title: string; url: string; relevance?: string }>;
  expertise_area?: string;
  agent_id?: string;
}

interface ContrarianObservation {
  critique: string;
  alternative_framework: string;
  blind_spots: string[];
  counter_evidence?: Array<{ title: string; url: string; summary?: string }>;
}

interface ExpertDiscussionProps {
  experts: ExpertPosition[];
  contrarians?: ContrarianObservation[];
  autoPlay?: boolean;
  speed?: "slow" | "normal" | "fast";
}

const EXPERT_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-red-500 to-rose-500",
  "from-indigo-500 to-violet-500",
  "from-teal-500 to-green-500",
  "from-fuchsia-500 to-purple-500",
];

const CONTRARIAN_COLOR = "from-slate-600 to-slate-800";

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ExpertAvatar({ 
  name, 
  colorIndex, 
  isContrarian = false,
  isActive = false,
  isSpeaking = false,
}: { 
  name: string; 
  colorIndex: number; 
  isContrarian?: boolean;
  isActive?: boolean;
  isSpeaking?: boolean;
}) {
  const color = isContrarian ? CONTRARIAN_COLOR : EXPERT_COLORS[colorIndex % EXPERT_COLORS.length];
  
  return (
    <div className={cn(
      "relative transition-all duration-300",
      isActive && "scale-110",
      isSpeaking && "animate-pulse"
    )}>
      <Avatar size="xl">
        <AvatarFallback className={cn("bg-gradient-to-br text-lg", color)}>
          {isContrarian ? "?" : getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {isSpeaking && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <span className="animate-bounce h-2 w-2 rounded-full bg-green-500" style={{ animationDelay: "0ms" }} />
          <span className="animate-bounce h-2 w-2 rounded-full bg-green-500" style={{ animationDelay: "150ms" }} />
          <span className="animate-bounce h-2 w-2 rounded-full bg-green-500" style={{ animationDelay: "300ms" }} />
        </div>
      )}
      {isActive && !isSpeaking && (
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
      )}
    </div>
  );
}

function SpeechBubble({ 
  children, 
  isVisible, 
  direction = "left",
  variant = "expert",
}: { 
  children: React.ReactNode; 
  isVisible: boolean;
  direction?: "left" | "right";
  variant?: "expert" | "contrarian";
}) {
  return (
    <div
      className={cn(
        "relative max-w-xl transition-all duration-500 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none",
        direction === "right" && "ml-auto"
      )}
    >
      <div
        className={cn(
          "rounded-2xl p-4 shadow-lg",
          variant === "expert" 
            ? "bg-white border border-slate-200" 
            : "bg-slate-800 text-white border border-slate-700"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "absolute top-4 w-3 h-3 rotate-45",
          direction === "left" ? "-left-1.5" : "-right-1.5",
          variant === "expert" 
            ? "bg-white border-l border-b border-slate-200" 
            : "bg-slate-800 border-l border-b border-slate-700"
        )}
      />
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percentage = (confidence / 10) * 100;
  const color = confidence >= 7 ? "bg-green-500" : confidence >= 4 ? "bg-yellow-500" : "bg-red-500";
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500">Confidence</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700">{confidence}/10</span>
    </div>
  );
}

function TypewriterText({ text, isActive, speed = 20 }: { text: string; isActive: boolean; speed?: number }) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (!isActive) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    let index = 0;
    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isActive, speed]);

  return (
    <span>
      {displayedText}
      {isActive && !isComplete && (
        <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

export default function ExpertDiscussion({ 
  experts, 
  contrarians = [],
  autoPlay = true,
  speed = "normal",
}: ExpertDiscussionProps) {
  const [currentSpeaker, setCurrentSpeaker] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [showAll, setShowAll] = React.useState(false);

  const allSpeakers = React.useMemo(() => {
    const speakers: Array<{
      type: "expert" | "contrarian";
      data: ExpertPosition | ContrarianObservation;
      index: number;
    }> = [];
    
    experts.forEach((expert, index) => {
      speakers.push({ type: "expert", data: expert, index });
    });
    
    contrarians.forEach((contrarian, index) => {
      speakers.push({ type: "contrarian", data: contrarian, index });
    });
    
    return speakers;
  }, [experts, contrarians]);

  const speedMs = speed === "slow" ? 8000 : speed === "fast" ? 3000 : 5000;

  React.useEffect(() => {
    if (!isPlaying || showAll) return;

    const interval = setInterval(() => {
      setCurrentSpeaker((prev) => (prev + 1) % allSpeakers.length);
    }, speedMs);

    return () => clearInterval(interval);
  }, [isPlaying, showAll, allSpeakers.length, speedMs]);

  if (allSpeakers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No expert positions to display.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isPlaying 
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                : "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              showAll 
                ? "bg-blue-500 text-white" 
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            )}
          >
            {showAll ? "Animated View" : "Show All"}
          </button>
        </div>
        <div className="text-sm text-slate-500">
          {currentSpeaker + 1} of {allSpeakers.length} speakers
        </div>
      </div>

      {/* Expert Avatars Row */}
      <div className="flex items-center justify-center gap-4 py-4 overflow-x-auto">
        {experts.map((expert, index) => (
          <div 
            key={`expert-${index}`}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => {
              setCurrentSpeaker(index);
              setIsPlaying(false);
            }}
          >
            <ExpertAvatar
              name={expert.expertise_area || `Expert ${index + 1}`}
              colorIndex={index}
              isActive={!showAll && currentSpeaker === index}
              isSpeaking={!showAll && currentSpeaker === index && isPlaying}
            />
            <span className={cn(
              "text-xs font-medium text-center max-w-[80px] truncate transition-colors",
              currentSpeaker === index ? "text-slate-900" : "text-slate-500"
            )}>
              {expert.expertise_area || `Expert ${index + 1}`}
            </span>
          </div>
        ))}
        {contrarians.map((_, index) => (
          <div 
            key={`contrarian-${index}`}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => {
              setCurrentSpeaker(experts.length + index);
              setIsPlaying(false);
            }}
          >
            <ExpertAvatar
              name="Contrarian"
              colorIndex={0}
              isContrarian
              isActive={!showAll && currentSpeaker === experts.length + index}
              isSpeaking={!showAll && currentSpeaker === experts.length + index && isPlaying}
            />
            <span className={cn(
              "text-xs font-medium text-center transition-colors",
              currentSpeaker === experts.length + index ? "text-slate-900" : "text-slate-500"
            )}>
              Contrarian {index + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Discussion Area */}
      <div className="min-h-[300px] bg-gradient-to-b from-slate-50 to-white rounded-xl p-6 border border-slate-200">
        {showAll ? (
          <div className="space-y-6">
            {allSpeakers.map((speaker, index) => (
              <div 
                key={index}
                className={cn(
                  "flex gap-4",
                  index % 2 === 1 && "flex-row-reverse"
                )}
              >
                <ExpertAvatar
                  name={speaker.type === "expert" 
                    ? (speaker.data as ExpertPosition).expertise_area || `Expert ${speaker.index + 1}`
                    : "Contrarian"
                  }
                  colorIndex={speaker.index}
                  isContrarian={speaker.type === "contrarian"}
                />
                <SpeechBubble 
                  isVisible={true} 
                  direction={index % 2 === 0 ? "left" : "right"}
                  variant={speaker.type}
                >
                  {speaker.type === "expert" ? (
                    <div>
                      <div className="font-medium text-slate-900 mb-1">
                        {(speaker.data as ExpertPosition).expertise_area || `Expert ${speaker.index + 1}`}
                      </div>
                      <p className="text-sm text-slate-700">
                        {(speaker.data as ExpertPosition).position}
                      </p>
                      <ConfidenceMeter confidence={(speaker.data as ExpertPosition).confidence} />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-white mb-1">
                        Contrarian Challenge
                      </div>
                      <p className="text-sm text-slate-300">
                        {(speaker.data as ContrarianObservation).critique.slice(0, 200)}
                        {(speaker.data as ContrarianObservation).critique.length > 200 && "..."}
                      </p>
                      {(speaker.data as ContrarianObservation).blind_spots.length > 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          Blind spots identified: {(speaker.data as ContrarianObservation).blind_spots.length}
                        </div>
                      )}
                    </div>
                  )}
                </SpeechBubble>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-4">
            {allSpeakers[currentSpeaker] && (
              <>
                <ExpertAvatar
                  name={allSpeakers[currentSpeaker].type === "expert"
                    ? (allSpeakers[currentSpeaker].data as ExpertPosition).expertise_area || `Expert ${allSpeakers[currentSpeaker].index + 1}`
                    : "Contrarian"
                  }
                  colorIndex={allSpeakers[currentSpeaker].index}
                  isContrarian={allSpeakers[currentSpeaker].type === "contrarian"}
                  isSpeaking={isPlaying}
                />
                <SpeechBubble 
                  isVisible={true}
                  variant={allSpeakers[currentSpeaker].type}
                >
                  {allSpeakers[currentSpeaker].type === "expert" ? (
                    <div>
                      <div className="font-medium text-slate-900 mb-2">
                        {(allSpeakers[currentSpeaker].data as ExpertPosition).expertise_area || `Expert ${allSpeakers[currentSpeaker].index + 1}`}
                      </div>
                      <p className="text-slate-700">
                        <TypewriterText 
                          text={(allSpeakers[currentSpeaker].data as ExpertPosition).position}
                          isActive={isPlaying}
                          speed={speed === "slow" ? 30 : speed === "fast" ? 10 : 20}
                        />
                      </p>
                      <ConfidenceMeter confidence={(allSpeakers[currentSpeaker].data as ExpertPosition).confidence} />
                      {(allSpeakers[currentSpeaker].data as ExpertPosition).sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Sources:</div>
                          <div className="flex flex-wrap gap-1">
                            {(allSpeakers[currentSpeaker].data as ExpertPosition).sources.slice(0, 3).map((source, i) => (
                              <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors truncate max-w-[150px]"
                              >
                                {source.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-white mb-2">
                        Contrarian Challenge
                      </div>
                      <p className="text-slate-200">
                        <TypewriterText 
                          text={(allSpeakers[currentSpeaker].data as ContrarianObservation).critique}
                          isActive={isPlaying}
                          speed={speed === "slow" ? 30 : speed === "fast" ? 10 : 20}
                        />
                      </p>
                      {(allSpeakers[currentSpeaker].data as ContrarianObservation).blind_spots.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <div className="text-xs text-slate-400 mb-1">Blind Spots Identified:</div>
                          <ul className="text-xs text-slate-300 space-y-1">
                            {(allSpeakers[currentSpeaker].data as ContrarianObservation).blind_spots.map((spot, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-amber-400">!</span>
                                <span>{spot}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </SpeechBubble>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Dots */}
      {!showAll && (
        <div className="flex justify-center gap-2">
          {allSpeakers.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSpeaker(index);
                setIsPlaying(false);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentSpeaker === index 
                  ? "bg-blue-500 w-6" 
                  : "bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
