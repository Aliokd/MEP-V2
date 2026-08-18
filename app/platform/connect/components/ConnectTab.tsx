"use client";
import { safeLocalStorageSetItem } from '@/lib/storage';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSanction } from '@/lib/useSanction';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Heart, Paperclip, X, Music, Video, Image, FileText, MoreHorizontal, MessageSquare, Trash2, Edit, ChevronUp, ChevronDown, Plus, Check, LayoutGrid, ThumbsUp, Repeat, Send, Loader2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProSongwritersPanel from './ProSongwritersPanel';
import { fetchPlatformUsers, setConnection, useConnections, type PlatformUser } from '@/lib/connections';
import ConfirmDialog from '@/components/ConfirmDialog';
import { setPlaybackAudioSession } from '@/lib/audioSession';
import ReportDialog from '@/components/ReportDialog';

// ==========================================
// TYPES DEFINITIONS
// ==========================================
interface Attachment {
  name: string;
  type: string;
  url: string;
}

interface Comment {
  id: string;
  author: string;
  avatarFallback: string;
  time: string;
  body: string;
}

interface Post {
  id: string;
  /** Firebase uid of the author. Firestore rules gate edit/delete on this. */
  authorId?: string | null;
  author: string;
  avatarFallback: string;
  time: string;
  projectName: string;
  body: string;
  lyrics: string[];
  attachment: Attachment | null;
  audioNotes?: any[];
  kudos: number;
  liked: boolean;
  likedBy?: string[];
  comments: Comment[];
  reposts: number;
  reposted: boolean;
  repostedBy?: string[];
  createdAt?: number;
  /** Set by the moderation console. Hidden posts stay visible to their author only. */
  hidden?: boolean;
  moderationReason?: string | null;
}

// ==========================================
// SUBCOMPONENT: INLINE PROJECT CANVAS
// ==========================================
function ProjectCanvasInline({ post }: { post: Post }) {
  const { t } = useLanguage();
  const getLyricBlocks = () => {
    const total = post.lyrics.length;
    if (total <= 4) {
      return [
        { label: 'VERSE 1', lines: post.lyrics, audio: null }
      ];
    } else if (total <= 8) {
      return [
        { label: 'VERSE 1', lines: post.lyrics.slice(0, 4), audio: null },
        { label: 'CHORUS 1', lines: post.lyrics.slice(4), audio: { name: 'Audio Take 1', duration: '00:05' } }
      ];
    } else {
      const size = Math.ceil(total / 3);
      return [
        { label: 'VERSE 1', lines: post.lyrics.slice(0, size), audio: null },
        { label: 'CHORUS 1', lines: post.lyrics.slice(size, size * 2), audio: { name: 'Audio Take 1', duration: '00:05' } },
        { label: 'CHORUS 2', lines: post.lyrics.slice(size * 2), audio: null }
      ];
    }
  };

  const blocks = getLyricBlocks();

  return (
    <div className="mt-4 mb-4 pt-4 border-t border-stone-150/50 flex flex-col gap-5 bg-[#FAF9F5]/60 rounded-2xl p-5 border border-stone-200/40 select-none">
      <div className="flex justify-between items-center px-1">
        <span className="font-sans text-[13px] font-semibold text-stone-500">{t('connect.project_canvas')}</span>
        {/* Co-writing Badge */}
        <div className="flex items-center gap-1 bg-[#eaf5ec] border border-[#d2ebda] rounded-full px-2.5 py-0.5 text-[9px] font-semibold text-[#2f6f40] shadow-3xs select-none">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>{t('connect.cowriting_badge')}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {blocks.map((block, i) => (
          <div 
            key={i}
            className="relative border border-stone-200/80 rounded-[18px] p-5 pt-8 pb-5 bg-white shadow-3xs flex flex-col items-center justify-center"
          >
            {/* Top-left Border Tag badge */}
            <div className="absolute -top-2.5 left-4 bg-[#0c0c0c] text-[#FAF9F5] text-[7.5px] font-bold px-2 py-0.5 rounded-[3px] flex items-center gap-1 uppercase tracking-wider select-none border border-stone-900 shadow-sm">
              <span>{block.label}</span>
              <span className="opacity-40 hover:opacity-100 cursor-pointer text-[8px] leading-none">×</span>
            </div>

            {/* Audio Pill Player (if configured) on the border */}
            {block.audio && (
              <div className="absolute -top-3 right-4 bg-white border border-stone-200 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 text-[8.5px] font-bold text-stone-600 shadow-3xs select-none">
                <span className="font-sans text-stone-750">{block.audio.name}</span>
                <span className="w-[1px] h-2 bg-stone-200" />
                <svg className="w-2.5 h-2.5 fill-stone-750" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="w-[1px] h-2 bg-stone-200" />
                <span className="text-stone-400 font-sans font-medium">{block.audio.duration}</span>
              </div>
            )}

            {/* Lyrics List */}
            <div className="flex flex-col gap-2 text-center w-full max-w-md">
              {block.lines.map((line, idx) => (
                <p 
                  key={idx} 
                  className="font-sans text-[15px] font-light text-stone-800 leading-relaxed tracking-wide"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: CONNECT POST CARD
// ==========================================
interface PostCardProps {
  post: Post;
  isActive: boolean;
  isPaused: boolean;
  onActive: () => void;
  onDeactive: (id: string) => void;
  onClickActive: () => void;
  onPauseToggle: () => void;
  currentUserDisplayName: string;
  currentUserId: string | null;
  editingPostId: string | null;
  editingText: string;
  activeMenuPostId: string | null;
  expandedCommentPostId: string | null;
  commentInputTexts: { [postId: string]: string };
  onKudos: (id: string) => void;
  onCommentToggle: (id: string) => void;
  onCommentChange: (id: string, val: string) => void;
  onCommentSubmit: (e: React.FormEvent, id: string) => void;
  /** False while the reader is muted: the composer is hidden rather than
   *  accepting text that firestore.rules will refuse. */
  canComment?: boolean;
  onCommentDelete: (pid: string, cid: string) => void;
  onStartEdit: (post: Post) => void;
  onDeletePost: (id: string) => void;
  onReport: (post: Post) => void;
  onMenuToggle: (id: string | null) => void;
  onEditingTextChange: (val: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onViewProject: (post: Post) => void;
  onRepost: (id: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

function ConnectPostCard({
  post,
  isActive,
  isPaused,
  onActive,
  onDeactive,
  onClickActive,
  onPauseToggle,
  currentUserDisplayName,
  currentUserId,
  editingPostId,
  editingText,
  activeMenuPostId,
  expandedCommentPostId,
  commentInputTexts,
  onKudos,
  onCommentToggle,
  onCommentChange,
  onCommentSubmit,
  canComment = true,
  onCommentDelete,
  onStartEdit,
  onDeletePost,
  onReport,
  onMenuToggle,
  onEditingTextChange,
  onSaveEdit,
  onCancelEdit,
  onViewProject,
  onRepost,
  dropdownRef
}: PostCardProps) {
  const { t } = useLanguage();
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Custom drag and direction tracking refs for autoplay
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);  
  const scrollDirectionRef = useRef<'down' | 'up'>('down');
  const frameCountRef = useRef<number>(0);

  // Play states controlled globally by parent activePostId and manuallyPausedPosts states
  const [isHovered, setIsHovered] = useState(false);
  const isPlaying = isActive && !isPaused;

  // Playlist states for multi-track audio playback support
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  // Helper to parse timestamp for sorting chronologically
  const getAudioNoteTimestamp = (an: any): number => {
    if (!an) return 0;
    if (an.createdAt) {
      if (typeof an.createdAt === 'number') {
        return an.createdAt;
      }
      if (typeof an.createdAt === 'object' && an.createdAt !== null && 'seconds' in an.createdAt) {
        return (an.createdAt as any).seconds * 1000;
      }
      const parsed = Date.parse(an.createdAt as any);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    if (an.id && typeof an.id === 'string') {
      if (an.id.startsWith('rec-')) {
        const parsedId = parseInt(an.id.replace('rec-', ''));
        if (!isNaN(parsedId)) return parsedId;
      }
      if (an.id.startsWith('audio-')) {
        const parsedId = parseInt(an.id.replace('audio-', ''));
        if (!isNaN(parsedId)) return parsedId;
      }
      if (an.id.startsWith('studio-mix-')) {
        const parsedId = parseInt(an.id.replace('studio-mix-', ''));
        if (!isNaN(parsedId)) return parsedId;
      }
    }
    return 0;
  };

  const playlist = useMemo(() => {
    if (post.audioNotes && post.audioNotes.length > 0) {
      // Sort oldest to newest (first play first, last play last)
      const sorted = [...post.audioNotes].sort((a, b) => getAudioNoteTimestamp(a) - getAudioNoteTimestamp(b));
      
      // Filter for studio versions if at least one exists
      const studioNotes = sorted.filter(an => 
        an.id?.startsWith('studio-mix-') || 
        an.title?.toLowerCase().includes('studio') || 
        an.title?.toLowerCase().includes('mixdown')
      );
      
      const targetNotes = studioNotes.length > 0 ? studioNotes : sorted;
      return targetNotes.map(an => an.url).filter(Boolean);
    }
    if (post.attachment?.url) {
      return [post.attachment.url];
    }
    return [];
  }, [post.audioNotes, post.attachment]);

  const currentAudioSrc = playlist[currentAudioIndex] || '';

  // Reset scroll to top line and flags when play state changes (entering or leaving play)
  useEffect(() => {
    scrollToIndex(0, 'smooth');
    setActiveLineIndex(0);
    isUserScrollingRef.current = false;
    scrollDirectionRef.current = 'down';
    frameCountRef.current = 0;
  }, [isPlaying]);

  // Manage audio play/pause in sync with isPlaying state, playlist and current index
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && currentAudioSrc) {
      audioRef.current.load();
      // iOS: overrides the ring/silent switch, which otherwise plays this at zero volume.
      setPlaybackAudioSession();
      audioRef.current.play().catch(err => {
        console.warn("Failed to play attachment audio:", err);
      });
    } else {
      audioRef.current.pause();
      if (!isPlaying) {
        audioRef.current.currentTime = 0;
        setCurrentAudioIndex(0);
      }
    }
  }, [isPlaying, currentAudioIndex, currentAudioSrc]);

  const handleAudioEnded = () => {
    if (currentAudioIndex < playlist.length - 1) {
      // Transition to next track in the playlist sequence
      setCurrentAudioIndex(prev => prev + 1);
    } else {
      if (currentAudioIndex === 0) {
        // Single track loop fallback
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          setPlaybackAudioSession();
          audioRef.current.play().catch(err => console.warn(err));
        }
      } else {
        // Multi-track loop back to the first track
        setCurrentAudioIndex(0);
      }
    }
  };

  // Scroll to index helper (aligns target line near the upper-middle focus zone)
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollerRef.current;
    if (!container) return;
    const children = container.children;
    const targetChild = children[index + 1] as HTMLDivElement; // index + 1 to skip top spacer
    if (targetChild) {
      // Offset scales with the scroller's own live height so the spotlighted line lands in
      // roughly the same relative position at every breakpoint (tuned against the 305px/70px
      // desktop ratio).
      const centeringOffset = container.clientHeight * (70 / 305);
      const targetScrollTop = Math.max(0, targetChild.offsetTop - centeringOffset);
      
      isProgrammaticScrollingRef.current = true;
      container.scrollTo({
        top: targetScrollTop,
        behavior
      });
      setActiveLineIndex(index);
      
      setTimeout(() => {
        isProgrammaticScrollingRef.current = false;
      }, 600);
    }
  };

  // Up & Down Arrow Handlers
  const handleArrowUp = () => {
    if (activeLineIndex > 0) {
      scrollToIndex(activeLineIndex - 1);
    }
  };

  const handleArrowDown = () => {
    if (activeLineIndex < post.lyrics.length - 1) {
      scrollToIndex(activeLineIndex + 1);
    }
  };

  // Auto-advance lyrics step-by-step (jumps from line to line, centering each smoothly)
  useEffect(() => {
    let animFrameId: number;
    let lastTriggerTime = performance.now();
    const intervalMs = 1300; // Rest on each line for 1.3 seconds (slightly faster)

    const step = (now: number) => {
      const container = scrollerRef.current;
      if (isPlaying && container && !isUserScrollingRef.current && !isProgrammaticScrollingRef.current) {
        if (now - lastTriggerTime >= intervalMs) {
          lastTriggerTime = now;
          
          setActiveLineIndex(prevIndex => {
            if (post.lyrics.length <= 1) return 0;
            
            let nextIndex = prevIndex;
            if (scrollDirectionRef.current === 'down') {
              if (prevIndex < post.lyrics.length - 1) {
                nextIndex = prevIndex + 1;
              } else {
                scrollDirectionRef.current = 'up';
                nextIndex = Math.max(0, prevIndex - 1);
              }
            } else {
              if (prevIndex > 0) {
                nextIndex = prevIndex - 1;
              } else {
                scrollDirectionRef.current = 'down';
                nextIndex = Math.min(post.lyrics.length - 1, prevIndex + 1);
              }
            }
            
            // Center the newly active line inside the focus viewport smoothly
            scrollToIndex(nextIndex, 'smooth');
            return nextIndex;
          });
        }
      } else {
        lastTriggerTime = now; // update last trigger time to prevent sudden jump on resume
      }
      animFrameId = requestAnimationFrame(step);
    };

    if (isPlaying) {
      animFrameId = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying, post.lyrics.length]);

  // Drag to scroll handlers for lyrics viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('textarea') || target.closest('input') || target.closest('a')) {
      return;
    }
    e.preventDefault();
    const container = scrollerRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startScrollTopRef.current = container.scrollTop;
    isUserScrollingRef.current = true; // Stop autoplay
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const container = scrollerRef.current;
    if (!container) return;
    const deltaY = e.clientY - startYRef.current;
    container.scrollTop = startScrollTopRef.current - deltaY;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Track manual scrolls to highlight nearest line in upper focus zone
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScrollingRef.current) return;
    if (!isUserScrollingRef.current) return; // Only process manual scroll events
    
    const container = e.currentTarget;
    const scrollPos = container.scrollTop;
    const children = container.children;
    
    let closestIdxInLyrics = 0;
    let closestDistance = Infinity;
    const targetY = scrollPos + 100; // Focus zone is near the upper-middle of container

    for (let i = 0; i < post.lyrics.length; i++) {
      const child = children[i + 1] as HTMLDivElement; // i + 1 to skip top spacer
      if (child) {
        const childCenter = child.offsetTop + child.clientHeight / 2;
        const dist = Math.abs(targetY - childCenter);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestIdxInLyrics = i;
        }
      }
    }

    if (closestIdxInLyrics !== activeLineIndex) {
      setActiveLineIndex(closestIdxInLyrics);
    }

    // Permanently yield control to the user for this hover session when they interact
    isUserScrollingRef.current = true;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('textarea') || 
      target.closest('input') || 
      target.closest('a') || 
      target.closest('svg')
    ) {
      return;
    }
    onClickActive();
  };

  return (
    <div 
      className="relative group" 
      ref={cardRef} 
      onMouseEnter={() => {
        setIsHovered(true);
        isUserScrollingRef.current = false;
        onActive();
      }} 
      onMouseLeave={() => {
        setIsHovered(false);
        onDeactive(post.id);
      }}
      onClick={handleCardClick}
    >
      {currentAudioSrc && (
        <audio 
          ref={audioRef}
          src={currentAudioSrc}
          preload="auto"
          onEnded={handleAudioEnded}
        />
      )}
      {/* Slide Page Sleeve (peeks out behind CD and card, moves slightly left) */}
      <div 
        className={`
          absolute top-0 h-[240px] w-[230px] bg-[#EBEBE3] rounded-l-[24px] z-0 transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none border-y border-l border-stone-300/30
          ${isPlaying 
            ? '-left-6 opacity-100' 
            : 'left-6 opacity-0'
          }
        `}
      />

      {/* Peeking CD Record under/behind the card (moves slightly left, peeking out past sleeve) */}
      <div 
        className={`
          absolute top-1 w-[230px] h-[230px] z-0 select-none pointer-events-none
          transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isPlaying 
            ? '-left-10 opacity-100 scale-100' 
            : 'left-6 opacity-0 scale-75'
          }
        `}
      >
        {/* Inner rotating CD record (free from vertical translation conflict, styled with 4-sweep vinyl reflection sheen, spins left/counter-clockwise) */}
        <div 
          className={`w-full h-full bg-[conic-gradient(from_0deg,#070605_0%,#4c4a46_12.5%,#070605_25%,#4c4a46_37.5%,#070605_50%,#4c4a46_62.5%,#070605_75%,#4c4a46_87.5%,#070605_100%)] rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative ${
            isPlaying ? 'animate-spin-reverse' : ''
          }`}
          style={{ animationDuration: '4.5s' }}
        >
          {/* Concentric Vinyl Groove Rings for textured reflection detail */}
          <div className="absolute inset-5 rounded-full border border-stone-700/15 pointer-events-none" />
          <div className="absolute inset-10 rounded-full border border-stone-700/20 pointer-events-none" />
          <div className="absolute inset-16 rounded-full border border-stone-700/15 pointer-events-none" />
          <div className="absolute inset-22 rounded-full border border-stone-700/20 pointer-events-none" />
          <div className="absolute inset-28 rounded-full border border-stone-700/15 pointer-events-none" />
          
          {/* Center spindle label (no outline circles) */}
          <div className="w-14 h-14 bg-[#FAF9F5] rounded-full flex items-center justify-center border border-stone-300 shadow-3xs relative z-10">
            <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Classic Record Player Tonearm (Needle Stick, rendered on top of CD, moves in sync with sleeve) */}
      {/* Classic Record Player Tonearm (Needle Stick, rendered on top of CD, moves in sync with sleeve) */}
      <div 
        className={`
          absolute top-[0px] z-5 w-12 h-36 origin-[32px_20px] pointer-events-none
          transition-all duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isPlaying 
            ? '-left-2 rotate-[10deg] opacity-100 scale-100' 
            : 'left-6 rotate-[-35deg] opacity-0 scale-95'
          }
        `}
      >
        <svg className="w-full h-full drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.22)]" viewBox="0 0 48 144" fill="none">
          {/* Tonearm metal stick (angled and beautifully rounded at top, straight vertical at bottom) */}
          <path 
            d="M32 20 C 28 28, 16 38, 16 52 L 16 116" 
            stroke="#EBEBE3" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Stylus / Headshell cartridge */}
          <rect 
            x="10" 
            y="116" 
            width="12" 
            height="18" 
            rx="2.5" 
            fill="#EBEBE3" 
          />
        </svg>
      </div>

      {/* Main card panel (moves slightly to the right) */}
      <div 
        className={`relative z-10 bg-white border border-stone-200/60 rounded-[24px] overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.02)] cursor-pointer flex flex-col justify-between min-h-[220px] shadow-3xs transition-[transform,box-shadow] duration-[950ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isPlaying ? 'translate-x-3' : 'translate-x-0'
        }`}
      >
        <div className="p-6 pb-2 flex-grow flex flex-col justify-between">
        
        {/* 1. Header Section: Project, Author, Tag Badge */}
        <div className="flex items-start justify-between mb-4 relative">
          <div className="flex flex-col">
            <span className="font-sans text-[20px] font-medium text-[#2c2a29] tracking-tight leading-snug">
              {post.projectName}
            </span>
            <span className="text-[14px] text-stone-400 font-sans mt-0.5 font-normal">
              {post.author}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {post.attachment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseToggle();
                }}
                className="w-7 h-7 rounded-full bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
                title={isPlaying ? "Pause melody" : (playlist.length > 1 ? `Play playlist (Track ${currentAudioIndex + 1}/${playlist.length})` : "Play melody")}
                type="button"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white stroke-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white stroke-white ml-0.5" />
                )}
              </button>
            )}
            <span className="bg-[#F6F6F0] text-stone-500 px-3 py-1 rounded-full text-[13px] font-normal font-sans select-none leading-none">
              {playlist.length > 1 
                ? `Lyrics + ${playlist.length} Tracks`
                : (playlist.length === 1 ? "Lyrics + melody" : "Lyrics only")}
            </span>
          </div>
        </div>

        {/* 2. Lyrics Section */}
        {editingPostId === post.id ? (
          <div className="mb-4">
            <textarea
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              className="w-full p-3 border border-stone-200 rounded-xl text-sm text-stone-850 outline-none resize-none min-h-[60px] focus:border-stone-400 font-sans"
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={onCancelEdit}
                className="px-3.5 py-1.5 border border-stone-200 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => onSaveEdit(post.id)}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-855 text-white rounded-full text-xs font-bold"
              >
                {t('common.save_changes')}
              </button>
            </div>
          </div>
        ) : (
          post.lyrics.length > 0 && (
            <div
              className={`overflow-hidden relative w-full transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isExpanded ? 'max-h-[3000px]' : 'max-h-[168px] sm:max-h-[230px] md:max-h-[320px]'
              }`}
            >
              {isExpanded ? (
                /* Expanded state: Show all lyrics vertically, flexible height, no scrollbars */
                <div className="py-4 mb-4 flex flex-col gap-6 w-full text-left">
                  {post.lyrics.map((line, idx) => {
                    const isActive = idx === activeLineIndex;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActiveLineIndex(idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLineIndex(idx);
                        }}
                        className={`
                          cursor-pointer tracking-wide leading-[34px] sm:leading-[48px] md:leading-[73px] font-sans text-[26px] sm:text-[38px] md:text-[60px] font-normal transition-all duration-300 origin-left
                          ${isActive
                            ? 'text-[#656565] opacity-100 scale-101 translate-x-1'
                            : 'text-[#656565] opacity-15 hover:opacity-40'
                          }
                        `}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Collapsed state: auto-scrolling spotlight viewport */
                <div className="py-2 mb-4 relative bg-transparent border-0 outline-none h-[168px] sm:h-[230px] md:h-[305px] flex items-center">
                  <div
                    ref={scrollerRef}
                    onScroll={handleScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className="flex-1 h-[168px] sm:h-[230px] md:h-[305px] overflow-y-auto overflow-x-hidden scroll-smooth text-left scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-transparent border-0 outline-none cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="h-4 shrink-0" />
                    
                    {post.lyrics.map((line, idx) => {
                      const isActive = idx === activeLineIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => scrollToIndex(idx)}
                          className={`
                            py-2.5 cursor-pointer tracking-wide leading-[34px] sm:leading-[48px] md:leading-[73px] font-sans text-[26px] sm:text-[38px] md:text-[60px] font-normal
                            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left
                            ${isActive
                              ? 'text-[#656565] opacity-100 scale-102 translate-x-1.5'
                              : 'text-[#656565] opacity-15 hover:opacity-35 scale-95 translate-x-0'
                            }
                          `}
                        >
                          {line}
                        </div>
                      );
                    })}

                    <div className="h-8 shrink-0" />
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* 3. Engagement Footer Actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100/50">
          <div className="flex gap-6 select-none items-center">
            {/* Kudos (Like) - Heart Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onKudos(post.id);
              }}
              className={`flex items-center gap-2 text-sm transition-colors duration-200 py-1 px-2 rounded-lg hover:bg-stone-50 group/btn
                ${post.liked 
                  ? 'text-stone-900 font-semibold' 
                  : 'text-stone-555 hover:text-stone-900'
                }
              `}
            >
              <Heart 
                className={`w-[17px] h-[17px] transition-all duration-200 group-active/btn:scale-90
                  ${post.liked 
                    ? 'fill-stone-900 stroke-stone-900' 
                    : 'stroke-stone-500 fill-none'
                  }
                `} 
              />
              <span className="font-sans text-[13px] font-medium leading-none">{post.kudos}</span>
            </button>

            {/* Comment */}
            {(() => {
              const hasUserCommented = post.comments?.some(c => c.author === currentUserDisplayName);
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCommentToggle(post.id);
                  }}
                  className={`flex items-center gap-2 text-sm transition-all duration-200 py-1 rounded-full group/btn
                    ${expandedCommentPostId === post.id 
                      ? 'bg-[#F6F6F0] text-stone-900 font-semibold px-3' 
                      : 'text-stone-555 hover:text-stone-900 hover:bg-stone-50 px-2'
                    }
                  `}
                >
                  <MessageSquare 
                    className={`w-[17px] h-[17px] transition-all duration-200 group-active/btn:scale-90
                      ${expandedCommentPostId === post.id 
                        ? 'fill-stone-900 stroke-stone-900' 
                        : hasUserCommented
                          ? 'fill-stone-500 stroke-stone-500'
                          : 'stroke-stone-500 fill-none'
                      }
                    `} 
                  />
                  <span className="font-sans text-[13px] font-medium leading-none">{post.comments?.length || 0}</span>
                </button>
              );
            })()}

            {/* Repost */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRepost(post.id);
              }}
              className={`flex items-center gap-2 text-sm transition-colors duration-200 py-1 px-2 rounded-lg hover:bg-stone-50 group/btn
                ${post.reposted 
                  ? 'text-green-600 font-semibold' 
                  : 'text-stone-550 hover:text-stone-900'
                }
              `}
            >
              <Repeat 
                className={`w-[17px] h-[17px] transition-all duration-200 group-active/btn:scale-90
                  ${post.reposted 
                    ? 'stroke-green-650 font-bold' 
                    : 'stroke-stone-500'
                  }
                `} 
              />
              <span className="font-sans text-[13px] font-medium leading-none">{post.reposts}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* More Actions Menu */}
            <div className="relative" ref={activeMenuPostId === post.id ? dropdownRef : null}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle(activeMenuPostId === post.id ? null : post.id);
                }}
                className="p-1 rounded-full hover:bg-stone-50 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {activeMenuPostId === post.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 bottom-8 bg-white border border-stone-200/60 rounded-xl shadow-md py-1.5 w-32 z-30"
                  >
                    {/* Ownership is the uid, not the display name — Firestore rules
                        gate edit/delete on authorId, so a name match would offer
                        actions the server rejects. Legacy posts written before
                        authorId existed still fall back to the name comparison. */}
                    {(post.authorId
                      ? post.authorId === currentUserId
                      : post.author.includes(currentUserDisplayName) || post.author === currentUserDisplayName) ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartEdit(post); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-stone-755 hover:bg-stone-50 flex items-center gap-2"
                        >
                          <Edit className="w-3 h-3 text-stone-500" />
                          {t('connect.edit_post')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-red-650 hover:bg-red-50/50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          {t('connect.delete_post')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); alert("Post shared!"); onMenuToggle(null); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-stone-755 hover:bg-stone-50 flex items-center gap-2"
                        >
                          {t('connect.share_link')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onReport(post); onMenuToggle(null); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-red-650 hover:bg-stone-50 flex items-center gap-2"
                        >
                          {t('connect.report_post')}
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* See projects in the canvas / Full view button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isExpanded) {
                  onViewProject(post);
                } else {
                  setIsExpanded(true);
                }
              }}
              className="border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-stone-50 transition-all active:scale-95 select-none"
            >
              {isExpanded ? t('connect.see_full_project') : t('connect.full_view')}
            </button>
          </div>
        </div>
      </div>
      {/* 6. Expanded Comment Section */}
      <AnimatePresence>
        {expandedCommentPostId === post.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden w-full bg-[#F6F6F0] border-t border-stone-200/60 px-6 pt-5 pb-6 text-left flex flex-col gap-4"
          >
            <style dangerouslySetInnerHTML={{__html: `
              .comments-scrollbar::-webkit-scrollbar {
                width: 5px;
              }
              .comments-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .comments-scrollbar::-webkit-scrollbar-thumb {
                background-color: rgba(180, 180, 172, 0.45);
                border-radius: 10px;
              }
              .comments-scrollbar::-webkit-scrollbar-button {
                display: none;
              }
            `}} />
            {post.comments && post.comments.length > 0 && (
              /* List of Comments with scroll control */
              <div 
                className={`flex flex-col gap-5 mb-1 pr-1.5 comments-scrollbar ${
                  post.comments.length > 2 
                    ? 'max-h-[290px] overflow-y-auto' 
                    : 'h-auto overflow-visible'
                }`}
              >
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex flex-col gap-1.5 text-left relative">
                    {/* Author Name */}
                    <span className="font-sans font-semibold text-[15.5px] text-stone-550">
                      {comment.author}
                    </span>
                    
                    {/* Comment Body Text */}
                    <p className="font-sans text-[14.5px] text-stone-600/90 leading-relaxed max-w-2xl">
                      {comment.body}
                    </p>
                    
                    {/* Bottom Interaction Pill (ThumbsUp + MessageSquare counts) */}
                    {/* Bottom Interaction (ThumbsUp + MessageSquare counts) - minimal styling */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-4 text-[12px] text-stone-500 select-none">
                        <button className="flex items-center gap-1 hover:text-stone-850 transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5 stroke-stone-400" />
                          <span>1</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-stone-850 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5 stroke-stone-400" />
                          <span>0</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Composer Box */}
            {canComment && (
            <form onSubmit={(e) => onCommentSubmit(e, post.id)} className="mt-1 flex flex-col gap-2">
              <div className="bg-[#EBEBE3] rounded-[18px] p-4 flex flex-col focus-within:ring-1 focus-within:ring-stone-400/40">
                <textarea
                  value={commentInputTexts[post.id] || ''}
                  onChange={(e) => onCommentChange(post.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onCommentSubmit(e, post.id);
                    }
                  }}
                  placeholder={t('connect.comment_placeholder')}
                  rows={2}
                  className="w-full bg-transparent border-none outline-none resize-none text-[16px] text-stone-800 placeholder-stone-400 font-sans leading-relaxed"
                  required
                />
                
                {((commentInputTexts[post.id] || '').trim().length > 0) && (
                  <div className="flex justify-end mt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition-colors select-none active:scale-95 animate-fade-in"
                    >
                      {t('connect.post_comment')}
                    </button>
                  </div>
                )}
              </div>
            </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}

// ==========================================
// SUBCOMPONENT: READ-ONLY PROJECT CANVAS MODAL
// ==========================================
interface CanvasModalProps {
  post: Post;
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  color: string;
  velocity: { x: number; y: number };
  life: number;
  size: number;
}

function ProjectCanvasModal({ post, onClose }: CanvasModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  // Split lyrics into structured Verse/Chorus blocks to replicate the canvas layout
  const getLyricBlocks = () => {
    const total = post.lyrics.length;
    if (total <= 4) {
      return [
        { label: 'VERSE 1', lines: post.lyrics, audio: null }
      ];
    } else if (total <= 8) {
      return [
        { label: 'VERSE 1', lines: post.lyrics.slice(0, 4), audio: null },
        { label: 'CHORUS 1', lines: post.lyrics.slice(4), audio: { name: 'Audio 1', duration: '00:05' } }
      ];
    } else {
      const size = Math.ceil(total / 3);
      return [
        { label: 'VERSE 1', lines: post.lyrics.slice(0, size), audio: null },
        { label: 'CHORUS 1', lines: post.lyrics.slice(size, size * 2), audio: { name: 'Audio 1', duration: '00:05' } },
        { label: 'CHORUS 2', lines: post.lyrics.slice(size * 2), audio: null }
      ];
    }
  };
  const blocks = getLyricBlocks();

  const [dupStatus, setDupStatus] = useState<'idle' | 'duplicating' | 'duplicated'>('idle');
  const [duplicatedNoteId, setDuplicatedNoteId] = useState<string | null>(null);

  const handleDuplicate = async () => {
    if (dupStatus === 'duplicated') {
      window.location.href = `/platform/create?noteId=${duplicatedNoteId || ''}`;
      return;
    }

    setDupStatus('duplicating');

    const newNoteId = 'n-dup-' + Date.now();
    setDuplicatedNoteId(newNoteId);
    
    const duplicatedProject = {
      id: newNoteId,
      title: post.projectName ? `${post.projectName} (Copy)` : 'Duplicated Song',
      content: `${post.projectName || 'Duplicated Song'}\n\nShared by ${post.author}\n\n${post.body || ''}\n\nLyrics:\n${post.lyrics.join('\n')}`,
      folderId: null,
      updatedAt: new Date().toLocaleString(),
      ownerId: user?.uid || 'anonymous',
      collaborators: [],
      audioNotes: post.audioNotes || [],
      audioUrl: post.attachment?.url || null,
      phrases: post.lyrics.map((line, idx) => ({
        id: `phrase-${idx}-${Date.now()}`,
        text: line,
        x: 120,
        y: 100 + (idx * 70),
        colorIndex: 0
      }))
    };

    // 1. Write to Firestore if logged in
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'projects', newNoteId), duplicatedProject);
      } catch (err) {
        console.error("Error duplicating project to Firestore:", err);
      }
    }

    // 2. Write to local cache fallback — the uid-scoped cache when signed in; the legacy
    //    unscoped key otherwise (account-scoped state must never land in shared keys, or it
    //    leaks into the next account that signs in on this browser).
    try {
      const cacheKey = user?.uid ? `veinote-create-notes-${user.uid}` : 'veinote-create-notes';
      const savedNotesRaw = localStorage.getItem(cacheKey);
      let currentNotes = [];
      if (savedNotesRaw) {
        currentNotes = JSON.parse(savedNotesRaw);
      }
      safeLocalStorageSetItem(cacheKey, JSON.stringify([duplicatedProject, ...currentNotes]));
    } catch (e) {
      console.error("Error writing duplicated project to cache fallback:", e);
    }

    // 3. Set success state and schedule auto-redirect
    setDupStatus('duplicated');
    setTimeout(() => {
      window.location.href = `/platform/create?noteId=${newNoteId}`;
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-3xl bg-[#FAF9F5] border border-stone-255/20 rounded-[28px] overflow-hidden flex flex-col shadow-2xl h-[85dvh]"
      >
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-stone-200/40 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center">
            <span className="font-sans text-[16px] font-medium text-stone-600 select-none">
              {post.projectName}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Duplicate Button to transfer project to Create page */}
            <button 
              onClick={handleDuplicate}
              disabled={dupStatus === 'duplicating'}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95 select-none flex items-center gap-1.5
                ${dupStatus === 'duplicated'
                  ? 'bg-green-650 text-white hover:bg-green-750'
                  : 'bg-stone-900 hover:bg-stone-850 text-white'
                }
              `}
            >
              {dupStatus === 'idle' && (
                <>
                  <span>{t('connect.duplicate')}</span>
                </>
              )}
              {dupStatus === 'duplicating' && (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t('connect.duplicating')}</span>
                </>
              )}
              {dupStatus === 'duplicated' && (
                <>
                  <Check size={12} className="stroke-[2.5]" />
                  <span>{t('connect.duplicated_success')}</span>
                </>
              )}
            </button>

            {/* Close button */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200/60 flex items-center justify-center transition-colors text-stone-700 active:scale-95 border border-stone-200/40"
              aria-label={t('connect.close_canvas')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Canvas Body (Scrollable stacks of lyric boxes) */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#FAF9F5] flex flex-col gap-6">
          {blocks.map((block, i) => (
            <div 
              key={i}
              className="relative border border-stone-200/80 rounded-[24px] p-10 pt-12 pb-10 bg-white shadow-3xs flex flex-col items-center justify-center transition-shadow duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.01)]"
            >
              {/* Top-left Border Tag badge */}
              <div className="absolute -top-3 left-6 bg-[#0c0c0c] text-[#FAF9F5] text-[9px] font-bold px-2.5 py-1 rounded-[4px] flex items-center gap-1.5 uppercase tracking-wider select-none border border-stone-900 shadow-sm">
                <span>{block.label}</span>
                <span className="opacity-40 hover:opacity-100 cursor-pointer text-[10px] leading-none">×</span>
              </div>

              {/* Audio Pill Player (if configured) on the border */}
              {block.audio && (
                <div className="absolute -top-3.5 right-8 bg-white border border-stone-200 rounded-full px-3 py-1 flex items-center gap-2.5 text-[9px] font-bold text-stone-600 shadow-3xs select-none">
                  <span className="font-sans text-stone-750">{block.audio.name}</span>
                  <span className="w-[1px] h-2.5 bg-stone-200" />
                  <svg className="w-2.5 h-2.5 fill-stone-750" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span className="w-[1px] h-2.5 bg-stone-200" />
                  {/* Micro-waveform indicators */}
                  <div className="flex gap-0.5 items-center">
                    <span className="w-[1.5px] h-1.5 bg-stone-400" />
                    <span className="w-[1.5px] h-3 bg-stone-500" />
                    <span className="w-[1.5px] h-2 bg-stone-400" />
                    <span className="w-[1.5px] h-1 bg-stone-300" />
                    <span className="w-[1.5px] h-2.5 bg-stone-400" />
                  </div>
                  <span className="text-stone-400 font-sans font-medium">{block.audio.duration}</span>
                  <span className="w-[1px] h-2.5 bg-stone-200" />
                  <svg 
                    className="w-2.5 h-2.5 text-stone-500 stroke-current fill-none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="2.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="w-[1px] h-2.5 bg-stone-200" />
                  <span className="text-stone-400 hover:text-stone-750 cursor-pointer text-sm font-light">×</span>
                </div>
              )}

              {/* Lyrics List */}
              <div className="flex flex-col gap-3.5 text-center w-full max-w-xl">
                {block.lines.map((line, idx) => (
                  <p 
                    key={idx} 
                    className="font-sans text-[21px] font-light text-stone-850 leading-relaxed tracking-wide font-sans"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: CONNECT LOADING SKELETON
// ==========================================
function ConnectSkeleton() {
  return (
    <div className="w-full max-w-[1000px] mx-auto py-4 px-4 font-sans mb-12 animate-pulse select-none">
      {/* 1. Connect row — songwriters box and PRO banner as peers, matching the
             loaded layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 md:items-stretch">
        <div className="min-w-0 bg-[#F6F6F0] border border-stone-200/50 rounded-[24px] py-6 px-0">
          <div className="h-5 w-56 bg-stone-300/30 rounded-full mb-5 mx-6" />
          <div className="flex gap-4 overflow-hidden px-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="min-w-[185px] max-w-[185px] min-h-[165px] bg-white border border-stone-200/60 rounded-[22px] p-5 flex flex-col justify-between relative shrink-0"
              >
                <div className="h-5 w-28 bg-stone-300/30 rounded-full" />
                <div className="absolute bottom-4 right-4 w-5 h-5 bg-stone-300/30 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex">
          <div className="flex-1 min-h-[213px] rounded-[24px] bg-stone-300/25" />
        </div>
      </div>

      {/* 2. Recent songs — heading plus the create button beside it */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-5 w-40 bg-stone-300/30 rounded-full" />
        <div className="h-9 w-32 bg-stone-300/25 rounded-full shrink-0" />
      </div>

      <div className="flex flex-col gap-12 w-full">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200/60 rounded-[24px] min-h-[220px] p-6 flex flex-col justify-between"
          >
            {/* Header: project name + author, tag pill */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-2">
                <div className="h-5 w-52 bg-stone-300/30 rounded-full" />
                <div className="h-3.5 w-32 bg-stone-200/40 rounded-full" />
              </div>
              <div className="h-6 w-28 bg-[#F6F6F0] rounded-full" />
            </div>

            {/* Lyrics block */}
            <div className="flex flex-col gap-4 py-2 mb-4">
              <div className="h-8 sm:h-10 md:h-12 w-3/4 bg-stone-200/40 rounded-full" />
              <div className="h-8 sm:h-10 md:h-12 w-2/3 bg-stone-200/25 rounded-full" />
              <div className="h-8 sm:h-10 md:h-12 w-1/2 bg-stone-200/15 rounded-full" />
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between mt-2 pt-4 border-t border-stone-100/50">
              <div className="flex gap-6 items-center">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-[17px] h-[17px] bg-stone-300/30 rounded-full" />
                    <div className="h-3 w-4 bg-stone-200/40 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 bg-stone-300/30 rounded-full" />
                <div className="h-7 w-24 bg-stone-200/40 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MAIN EXPORT COMPONENT: CONNECT TAB
// ==========================================
export default function ConnectTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sanction } = useSanction();
  const isMuted = sanction?.type === 'mute';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock initial community posts with structured lyrics
  const defaultPosts: Post[] = [
    {
      id: 'post-1',
      author: 'Ali Ould kaddour • Peter Nordberg',
      avatarFallback: 'AK',
      time: '2 hours ago',
      projectName: 'My first song ever...',
      body: 'Recorded a quick vocal melody draft for the chorus on pop songwriting practice. Let me know what you think of the transition!',
      lyrics: [
        "Lyrics line up here",
        "like crazy showing",
        "my talent and",
        "ambitions to eve...",
        "The club isn't the best place to find a lover",
        "So the bar is where I go (where I go)",
        "Me and my friends at the table doing shots",
        "Drinking fast and then we talk slow"
      ],
      attachment: {
        name: 'my_first_song.mp3',
        type: 'audio/mp3',
        url: '/my_first_song.mp3'
      },
      kudos: 24,
      liked: false,
      comments: [
        {
          id: 'c-1',
          author: 'Alek Vane',
          avatarFallback: 'AV',
          time: '1 hour ago',
          body: 'The key change into the chorus is smooth. Let\'s try adding a slight pre-chorus pause.'
        },
        {
          id: 'c-2',
          author: 'Elena Rostova',
          avatarFallback: 'ER',
          time: '30 mins ago',
          body: 'Love the vocal warmth here. What mic did you record this on?'
        }
      ],
      reposts: 12,
      reposted: false
    },
    {
      id: 'post-2',
      author: 'Alek Vane • Jonas Becker',
      avatarFallback: 'AV',
      time: '4 hours ago',
      projectName: 'Beachside Shoreline',
      body: 'Finished songwriting session practice (Pop Singer Songwriter category). Worked specifically on the lyrical structure and rhyming blocks for Verse 2.',
      lyrics: [
        "Old acoustic strings hum in the morning light",
        "Walking down the shoreline under winter sky",
        "Coffee in a paper cup, thoughts of you arise",
        "Wondering if our paths will cross, or say our last goodbyes",
        "Memory fades like fog on the bay",
        "Wishing you had chosen to stay",
        "Now I'm just writing these chords in the dark",
        "Looking for a light, hoping for a spark"
      ],
      attachment: null,
      kudos: 12,
      liked: false,
      comments: [],
      reposts: 4,
      reposted: false
    },
    {
      id: 'post-3',
      author: 'Elena Rostova • Liam Sterling',
      avatarFallback: 'ER',
      time: '1 day ago',
      projectName: 'Ivory Legato Study',
      body: 'Practicing composition chord progressions. Riffing on keyboard intro riffs to test chord fluidity.',
      lyrics: [
        "Soft touch on ivory keys, notes begin to blend",
        "Losing count of sleepless hours, waiting for the end",
        "A minor chord echoes out, secrets in the sound",
        "Finding peace in quiet spaces where the truth is found",
        "The velvet legato plays in the hall",
        "Shadows dancing slowly on the wall",
        "Hold the sustain, let the harmonics rise",
        "Underneath the weight of open skies"
      ],
      attachment: null,
      kudos: 9,
      liked: false,
      comments: [
        {
          id: 'c-3',
          author: 'Sarah Jenkins',
          avatarFallback: 'SJ',
          time: '18 hours ago',
          body: 'That chord transition is brilliant! What progressions are you using?'
        }
      ],
      reposts: 2,
      reposted: false
    }
  ];

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postText, setPostText] = useState('');
  const [attachedFile, setAttachedFile] = useState<Attachment | null>(null);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'text' | 'media'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  // Edit / Delete / Menu Actions State
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Replaces native window.confirm() for delete actions below.
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });

  // Comment Thread State
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  const [commentInputTexts, setCommentInputTexts] = useState<{ [postId: string]: string }>({});

  // View Project Canvas Modal State
  const [viewingProjectPost, setViewingProjectPost] = useState<Post | null>(null);

  // Active / Autoplay spotlight states
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [clickedActivePostId, setClickedActivePostId] = useState<string | null>(null);
  const [manuallyPausedPosts, setManuallyPausedPosts] = useState<{ [id: string]: boolean }>({});

  const handlePauseToggle = (postId: string) => {
    setManuallyPausedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleDeactive = (postId: string) => {
    if (clickedActivePostId === postId) return;
    setActivePostId(prev => (prev === postId ? null : prev));
  };

  // Real people on the platform, replacing the placeholder roster this row used
  // to render. Fetched once — a browse list gains nothing from a live listener,
  // and the connection state that *does* change is its own subscription.
  const [songwriters, setSongwriters] = useState<PlatformUser[]>([]);
  const [songwritersLoaded, setSongwritersLoaded] = useState(false);
  const { connections } = useConnections();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const users = await fetchPlatformUsers(user?.uid ?? null);
        if (!cancelled) setSongwriters(users);
      } catch (err) {
        console.error('Error loading platform users:', err);
      } finally {
        if (!cancelled) setSongwritersLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const hasDraggedSongwritersRef = useRef(false);

  // Resolves an onboarding answer id to its localized label. Users who signed up
  // before the quiz, or skipped it, simply show no specialty line.
  const songwriterTypeLabel = (typeId: string | null): string => {
    if (!typeId) return '';
    const key = `onboarding.questions.songwriter_type.options.${typeId}.title`;
    const label = t(key);
    return label === key ? '' : label;
  };

  const handleConnectSongwriter = async (targetUid: string) => {
    // A drag that ends over a card must not read as a click on it.
    if (hasDraggedSongwritersRef.current) return;
    if (!user) return;

    const isConnected = connections.includes(targetUid);
    try {
      await setConnection(user.uid, targetUid, !isConnected);
    } catch (err) {
      console.error('Error updating connection:', err);
    }
  };


  // Drag to scroll horizontally logic for songwriters list
  const songwritersScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingSongwriters, setIsDraggingSongwriters] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  // Momentum scroll physics refs
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  const handleSongwritersMouseDown = (e: React.MouseEvent) => {
    const container = songwritersScrollRef.current;
    if (!container) return;

    // Interrupt any running glide immediately on new click
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    setIsDraggingSongwriters(true);
    hasDraggedSongwritersRef.current = false;
    setDragStartX(e.pageX - container.offsetLeft);
    setDragScrollLeft(container.scrollLeft);

    // Initialize momentum tracking
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleSongwritersMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSongwriters) return;
    e.preventDefault();
    const container = songwritersScrollRef.current;
    if (!container) return;

    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragStartX) * 1.5; // multiplier for scroll speed
    if (Math.abs(walk) > 5) {
      hasDraggedSongwritersRef.current = true;
    }
    container.scrollLeft = dragScrollLeft - walk;

    // Calculate instantaneous velocity
    const now = performance.now();
    const deltaX = e.clientX - lastXRef.current;
    const deltaTime = now - lastTimeRef.current;
    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime;
    }
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;
  };

  const handleSongwritersMouseUpOrLeave = () => {
    setIsDraggingSongwriters(false);

    // Start momentum physics glide
    if (Math.abs(velocityRef.current) > 0.05) {
      let vel = velocityRef.current * 18; // speed scale
      const friction = 0.95; // deceleration multiplier

      const step = () => {
        const container = songwritersScrollRef.current;
        if (!container) return;

        container.scrollLeft -= vel;
        vel *= friction;

        if (Math.abs(vel) > 0.1) {
          animationFrameIdRef.current = requestAnimationFrame(step);
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(step);
    }
  };



  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuPostId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Collapse composer on outside click when empty
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        if (!postText.trim() && !attachedFile) {
          setIsComposing(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [postText, attachedFile]);

  // Load posts in real-time from Firestore on mount
  useEffect(() => {
    const postsRef = collection(db, 'connect_posts');
    const q = query(postsRef);

    // Safety net so a stalled connection can't leave the skeleton up forever
    const timeoutId = setTimeout(() => setIsLoadingPosts(false), 8000);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed database if empty. Stay in the loading state — writing the seed
        // triggers another snapshot, which is the one that resolves the skeleton.
        const batch = [];
        for (let i = 0; i < defaultPosts.length; i++) {
          const defaultPost = defaultPosts[i];
          const docRef = doc(db, 'connect_posts', defaultPost.id);
          batch.push(
            setDoc(docRef, {
              id: defaultPost.id,
              // Firestore rules require authorId == uid on create, so the seeder
              // stamps the signed-in user. `isSeed` lets the moderation console
              // tell demo content apart from real posts.
              authorId: user?.uid || null,
              isSeed: true,
              hidden: false,
              author: defaultPost.author,
              avatarFallback: defaultPost.avatarFallback,
              time: defaultPost.time,
              projectName: defaultPost.projectName,
              body: defaultPost.body,
              lyrics: defaultPost.lyrics,
              attachment: defaultPost.attachment,
              kudos: defaultPost.kudos,
              likedBy: [],
              comments: defaultPost.comments || [],
              reposts: defaultPost.reposts || 0,
              repostedBy: [],
              createdAt: Date.now() - (i * 3600000)
            })
          );
        }
        try {
          await Promise.all(batch);
        } catch (err) {
          console.error("Error seeding connect posts:", err);
          clearTimeout(timeoutId);
          setIsLoadingPosts(false);
        }
      } else {
        const loadedPosts: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // A moderator-hidden post stays readable to its author (so they can see
          // the outcome), but it never appears in anyone else's feed.
          if (data.hidden === true && data.authorId !== user?.uid) return;

          loadedPosts.push({
            id: docSnap.id,
            authorId: data.authorId || null,
            hidden: data.hidden === true,
            moderationReason: data.moderationReason || null,
            author: data.author,
            avatarFallback: data.avatarFallback,
            time: data.time || 'Just now',
            projectName: data.projectName || 'Draft',
            body: data.body || '',
            lyrics: data.lyrics || [],
            attachment: data.attachment || null,
            kudos: data.kudos || 0,
            likedBy: data.likedBy || [],
            liked: data.likedBy?.includes(user?.uid || '') || false,
            comments: data.comments || [],
            reposts: data.reposts || 0,
            repostedBy: data.repostedBy || [],
            reposted: data.repostedBy?.includes(user?.uid || '') || false,
            createdAt: data.createdAt || 0
          } as Post);
        });
        
        // Sort posts client-side by createdAt descending
        loadedPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPosts(loadedPosts);
        clearTimeout(timeoutId);
        setIsLoadingPosts(false);
      }
    }, (err) => {
      console.error("Error subscribing to connect posts:", err);
      clearTimeout(timeoutId);
      setIsLoadingPosts(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/')) return <Music className="w-4 h-4 text-stone-500" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4 text-stone-500" />;
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-stone-500" />;
    return <FileText className="w-4 h-4 text-stone-500" />;
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttachedFile({
        name: file.name,
        type: file.type,
        url: url
      });
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Create Post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;
    // The Firestore rule refuses this write anyway; stopping here is what makes
    // the refusal legible instead of a post that silently never appears.
    if (sanction?.type === 'mute') return;

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'Me';
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Dynamically split raw post text into lines to simulate writing lyrics
    const lines = postText.split('\n').filter(l => l.trim() !== '');
    const postId = 'post-' + Date.now();

    const newPost = {
      id: postId,
      authorId: user?.uid || null,
      author: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
      avatarFallback: user?.displayName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'AN',
      time: t('connect.just_now'),
      projectName: viewingProjectPost?.projectName || t('connect.untitled_song'),
      body: t('connect.shared_new_lyric'),
      lyrics: lines.length > 0 ? lines : [postText],
      attachment: attachedFile,
      kudos: 0,
      likedBy: [],
      comments: [],
      reposts: 0,
      repostedBy: [],
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'connect_posts', postId), newPost);
      window.dispatchEvent(new CustomEvent('songwriting-progress-updated', {
        detail: { triggerType: 'major-task' }
      }));
    } catch (err) {
      console.error("Error creating post:", err);
    }

    setPostText('');
    setAttachedFile(null);
    setIsComposing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Edit Post
  const handleStartEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditingText(post.lyrics.join('\n'));
    setActiveMenuPostId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editingText.trim()) return;
    
    const lines = editingText.split('\n').filter(l => l.trim() !== '');
    const updatedLyrics = lines.length > 0 ? lines : [editingText];

    try {
      await updateDoc(doc(db, 'connect_posts', postId), {
        lyrics: updatedLyrics
      });
    } catch (err) {
      console.error("Error saving post edit:", err);
    }

    setEditingPostId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditingText('');
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Post?',
      message: t('connect.delete_post_confirm'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'connect_posts', postId));
          setActiveMenuPostId(null);
        } catch (err) {
          console.error("Error deleting post:", err);
        }
      }
    });
  };

  // Toggle Kudos (Liking)
  const handleKudos = async (postId: string) => {
    const userId = user?.uid || '';
    if (!userId) return;

    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const likedBy = postToUpdate.likedBy || [];
    const isLiked = likedBy.includes(userId);
    const newLikedBy = isLiked 
      ? likedBy.filter(id => id !== userId) 
      : [...likedBy, userId];

    const newKudos = isLiked ? Math.max(0, postToUpdate.kudos - 1) : postToUpdate.kudos + 1;

    try {
      await updateDoc(doc(db, 'connect_posts', postId), {
        likedBy: newLikedBy,
        kudos: newKudos
      });
    } catch (err) {
      console.error("Error toggling kudos:", err);
    }
  };

  // Toggle Repost
  const handleRepost = async (postId: string) => {
    const userId = user?.uid || '';
    if (!userId) return;

    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const repostedBy = postToUpdate.repostedBy || [];
    const isReposted = repostedBy.includes(userId);
    const newRepostedBy = isReposted 
      ? repostedBy.filter(id => id !== userId) 
      : [...repostedBy, userId];

    const newReposts = isReposted ? Math.max(0, postToUpdate.reposts - 1) : postToUpdate.reposts + 1;

    try {
      await updateDoc(doc(db, 'connect_posts', postId), {
        repostedBy: newRepostedBy,
        reposts: newReposts
      });
    } catch (err) {
      console.error("Error toggling repost:", err);
    }
  };

  // Create Comment
  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = commentInputTexts[postId]?.trim();
    if (!text) return;
    // Blocked in firestore.rules too — a mute that stopped posts but allowed
    // comments would be no mute at all.
    if (isMuted) return;

    const displayName = user?.displayName || user?.email?.split('@')[0] || 'Me';
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newComment: Comment = {
      id: 'comment-' + Date.now(),
      author: displayName,
      avatarFallback: initials || 'ME',
      time: t('connect.just_now'),
      body: text
    };

    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const updatedComments = [...(postToUpdate.comments || []), newComment];

    try {
      await updateDoc(doc(db, 'connect_posts', postId), {
        comments: updatedComments
      });
    } catch (err) {
      console.error("Error adding comment:", err);
    }

    setCommentInputTexts(prev => ({ ...prev, [postId]: '' }));
  };

  // Delete Comment
  const handleDeleteComment = (postId: string, commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Comment?',
      message: t('connect.delete_comment_confirm'),
      onConfirm: async () => {
        const postToUpdate = posts.find(p => p.id === postId);
        if (!postToUpdate) return;

        const updatedComments = (postToUpdate.comments || []).filter(c => c.id !== commentId);

        try {
          await updateDoc(doc(db, 'connect_posts', postId), {
            comments: updatedComments
          });
        } catch (err) {
          console.error("Error deleting comment:", err);
        }
      }
    });
  };

  const filteredPosts = posts.filter(post => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'text') return !post.attachment;
    if (currentFilter === 'media') return !!post.attachment;
    return true;
  });

  const currentUserDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Me';

  if (isLoadingPosts) return <ConnectSkeleton />;

  return (
    <div className="w-full max-w-[1000px] mx-auto py-4 px-4 font-sans mb-12">
      
      {/* 1. Connect row — two peers side by side, not one box holding both: the
             songwriters container on the left, the PRO banner standing on the page
             background on the right. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 select-none md:items-stretch">
        <div className="min-w-0 bg-[#F6F6F0] border border-stone-200/50 rounded-[24px] py-6 px-0">
        <h3 className="text-[20px] font-sans font-medium tracking-tight text-stone-850 mb-5 px-6">
          {t('connect.connect_with_songwriters')}
        </h3>
        <div
          ref={songwritersScrollRef}
          onMouseDown={handleSongwritersMouseDown}
          onMouseMove={handleSongwritersMouseMove}
          onMouseUp={handleSongwritersMouseUpOrLeave}
          onMouseLeave={handleSongwritersMouseUpOrLeave}
          className={`flex gap-4 overflow-x-auto pb-1 px-6 scroll-px-6 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDraggingSongwriters ? 'cursor-grabbing select-none scroll-auto' : 'cursor-grab snap-x snap-mandatory scroll-smooth'
          }`}
        >
          {!songwritersLoaded && [...Array(3)].map((_, i) => (
            <div
              key={`sw-skeleton-${i}`}
              className="min-w-[185px] max-w-[185px] min-h-[165px] bg-white border border-stone-200/60 rounded-[22px] p-5 flex flex-col justify-between relative shrink-0 animate-pulse"
            >
              <div className="h-5 w-28 bg-stone-300/30 rounded-full" />
              <div className="absolute bottom-4 right-4 w-5 h-5 bg-stone-300/30 rounded-full" />
            </div>
          ))}

          {songwritersLoaded && songwriters.length === 0 && (
            <div className="min-h-[165px] flex items-center text-[14px] text-stone-500 font-sans pr-6">
              {t('connect.no_songwriters')}
            </div>
          )}

          {songwriters.map(sw => {
            const isConnected = connections.includes(sw.uid);
            const specialty = songwriterTypeLabel(sw.songwriterType);
            return (
            <div
              key={sw.uid}
              className={`min-w-[185px] max-w-[185px] min-h-[165px] bg-white border border-stone-200/60 rounded-[22px] p-5 flex flex-col justify-between relative hover:shadow-[0_4px_16px_rgba(0,0,0,0.015)] transition-all duration-300 group ${
                isDraggingSongwriters ? 'snap-none' : 'snap-start'
              }`}
            >
              {/* Name at top left with hover detail */}
              <div className="flex flex-col text-left select-none">
                <span className="text-[21px] font-sans font-medium text-stone-700 tracking-tight leading-snug break-words pr-2">
                  {sw.name}
                </span>

                {/* Fades in gently on hover. Both lines come from the user's own
                    record — the specialty is their onboarding answer, so a user
                    who skipped the quiz shows only the join date. */}
                <div className="touch-reveal opacity-0 group-hover:opacity-100 mt-2 transition-opacity duration-350 pointer-events-none flex flex-col gap-0.5 text-sm text-stone-400 font-sans">
                  {specialty && <div className="leading-snug">{specialty}</div>}
                  {sw.createdAt > 0 && (
                    <div className="leading-snug">
                      {t('connect.member_since')} {new Date(sw.createdAt).getFullYear()}
                    </div>
                  )}
                </div>
              </div>

              {/* Plus / Checked icon at bottom right (no circle, raw icon only) */}
              <button
                onClick={() => handleConnectSongwriter(sw.uid)}
                aria-pressed={isConnected}
                aria-label={`${isConnected ? t('connect.connected') : t('connect.connect_action')} — ${sw.name}`}
                className="absolute bottom-4 right-4 text-stone-550 hover:text-stone-850 transition-colors duration-200 active:scale-90 p-1 flex items-center justify-center"
              >
                {isConnected ? (
                  <Check className="w-5.5 h-5.5 text-stone-600 stroke-[2.5]" />
                ) : (
                  <Plus className="w-5.5 h-5.5 text-[#2c2a29] stroke-[2.5]" />
                )}
              </button>
            </div>
            );
          })}
        </div>
        </div>

        {/* Right half — PRO songwriters, Max tier. No section heading and no light
            container: the banner is its own surface, sitting directly on the page
            beside the songwriters box. `flex` lets it stretch to match that box's
            height, which the grid has already equalised. */}
        <div className="min-w-0 flex">
          <ProSongwritersPanel />
        </div>
      </div>

      {/* 2. Recent songs — the create action lives here now that the top banner is
             gone, so the entry point sits next to the thing it produces. */}
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-[20px] font-sans font-medium tracking-tight text-stone-850">
          {t('connect.recent_songs')}
        </h3>
        <a
          href="/platform/create"
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-[13px] font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95 select-none"
        >
          {t('connect.create_song_cta')}
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </a>
      </div>

      {/* A mute is otherwise invisible: the account works everywhere else, and
          the writes just fail. Saying so — with the reason the moderator gave —
          is the difference between a moderation decision and a broken feed. */}
      {isMuted && (
        <div className="w-full mb-8 rounded-[20px] border border-amber-200 bg-amber-50/90 p-5 flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-stone-800">{t('connect.muted_title')}</span>
          <p className="text-[14px] text-stone-600 leading-relaxed">{t('connect.muted_body')}</p>

          {sanction?.reason && (
            <p className="text-[14px] text-stone-700 leading-relaxed">
              <span className="font-semibold">{t('connect.muted_reason')}:</span> {sanction.reason}
            </p>
          )}

          <p className="text-[13px] text-stone-500">
            <span className="font-semibold">{t('connect.muted_until')}:</span>{' '}
            {sanction?.expiresAt
              ? new Date(sanction.expiresAt).toLocaleDateString()
              : t('connect.muted_indefinite')}
          </p>

          <p className="text-[13px] text-stone-500">{t('connect.muted_contact')}</p>
        </div>
      )}

      {/* Community Feed - List Layout with space for peeking CD */}
      <div className="flex flex-col gap-12 w-full">
        <AnimatePresence initial={false}>
          {filteredPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-stone-200/60 rounded-[20px] p-10 text-center text-stone-500 text-[14px] col-span-full"
            >
              {t('connect.no_posts_found')}
            </motion.div>
          ) : (
            filteredPosts.map(post => (
              <ConnectPostCard
                key={post.id}
                post={post}
                isActive={activePostId === post.id || clickedActivePostId === post.id}
                isPaused={!!manuallyPausedPosts[post.id]}
                onActive={() => {
                  setActivePostId(post.id);
                  if (clickedActivePostId !== post.id) {
                    setClickedActivePostId(null);
                  }
                }}
                onDeactive={handleDeactive}
                onClickActive={() => {
                  if (clickedActivePostId === post.id) {
                    setClickedActivePostId(null);
                    setActivePostId(null);
                  } else {
                    setClickedActivePostId(post.id);
                    setActivePostId(post.id);
                  }
                }}
                onPauseToggle={() => handlePauseToggle(post.id)}
                currentUserDisplayName={currentUserDisplayName}
                currentUserId={user?.uid || null}
                editingPostId={editingPostId}
                editingText={editingText}
                activeMenuPostId={activeMenuPostId}
                expandedCommentPostId={expandedCommentPostId}
                commentInputTexts={commentInputTexts}
                onKudos={handleKudos}
                onCommentToggle={(id) => setExpandedCommentPostId(expandedCommentPostId === id ? null : id)}
                onCommentChange={(id, val) => setCommentInputTexts(prev => ({ ...prev, [id]: val }))}
                onCommentSubmit={handleAddComment}
                canComment={!isMuted}
                onCommentDelete={handleDeleteComment}
                onStartEdit={handleStartEdit}
                onDeletePost={handleDeletePost}
                onReport={setReportingPost}
                onMenuToggle={setActiveMenuPostId}
                onEditingTextChange={setEditingText}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onViewProject={(p) => setViewingProjectPost(p)}
                onRepost={handleRepost}
                dropdownRef={dropdownRef}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Read-Only Project Constellation Canvas Modal */}
      <AnimatePresence>
        {viewingProjectPost && (
          <ProjectCanvasModal
            post={viewingProjectPost}
            onClose={() => setViewingProjectPost(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        destructive
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <ReportDialog
        isOpen={reportingPost !== null}
        onClose={() => setReportingPost(null)}
        targetType="post"
        targetId={reportingPost?.id || ''}
        targetLabel={reportingPost ? `${reportingPost.author} · ${reportingPost.projectName}` : undefined}
      />
    </div>
  );
}