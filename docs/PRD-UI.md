# Product Requirements Document: YouTube Podcast Transcript Processor UI

## Document Information
- **Version**: 1.1
- **Date**: 2025-01-27
- **Last Updated**: 2025-01-27
- **Status**: Active Implementation
- **Owner**: Development Team

---

## 1. Executive Summary

### 1.1 Product Vision
Build an intuitive, high-performance web application that enables users to extract, process, and export YouTube podcast transcripts with advanced features including speaker detection, deduplication, and TXT export format.

### 1.2 Problem Statement
Content creators, researchers, and podcast enthusiasts need a streamlined way to:
- Extract transcripts from YouTube videos/podcasts
- Clean and deduplicate transcript content
- Identify speakers automatically
- Export transcripts in TXT format with customizable options
- Process multiple videos efficiently

### 1.3 Solution Overview
A Next.js-based web application with a clean, modern UI that provides:
- Simple URL input for YouTube videos/channels/playlists
- Real-time processing status and progress tracking
- Interactive transcript viewer with speaker labels
- Advanced processing options (deduplication, speaker detection)
- TXT format export with download capabilities
- Channel and playlist video browsing

---

## 2. User Personas & Use Cases

### 2.1 Primary Personas

**Persona 1: Content Creator (Sarah)**
- **Goal**: Create blog posts from podcast transcripts
- **Needs**: Clean transcripts, speaker identification, easy export
- **Pain Points**: Manual transcript cleaning, speaker labeling

**Persona 2: Researcher (Dr. Chen)**
- **Goal**: Analyze podcast content for research
- **Needs**: Structured data (JSON), accurate transcripts, easy browsing
- **Pain Points**: Data extraction, finding relevant videos

**Persona 3: Podcast Enthusiast (Mike)**
- **Goal**: Create readable transcripts for personal use
- **Needs**: Simple interface, readable format, quick processing
- **Pain Points**: Complex tools, poor formatting

### 2.2 Key Use Cases

**UC1: Single Video Transcript Processing**
1. User enters YouTube video URL
2. System validates URL and fetches transcript
3. User selects processing options (deduplication, speaker detection)
4. System processes transcript with visual feedback
5. User views formatted transcript with speaker labels
6. User exports transcript in preferred format

**UC2: Channel/Playlist Video Browsing**
1. User enters YouTube channel or playlist URL
2. System detects the URL type and shows a detection message
3. User navigates to Channel or Playlist tab
4. System displays top 10 videos with metadata
5. User can copy/paste individual video URLs to process transcripts

**UC3: Transcript Customization**
1. User views processed transcript
2. User adjusts processing options (toggle deduplication, speaker detection)
3. System re-processes transcript in real-time
4. User sees updated transcript immediately

---

## 3. Functional Requirements

### 3.1 Core Features

#### FR1: URL Input & Validation
- **Description**: Accept YouTube video, channel, or playlist URLs
- **Requirements**:
  - Real-time URL validation with clear error messages
  - Support for multiple YouTube URL formats:
    - `youtube.com/watch?v=VIDEO_ID`
    - `youtu.be/VIDEO_ID`
    - `youtube.com/channel/CHANNEL_ID`
    - `youtube.com/@username`
    - `youtube.com/playlist?list=PLAYLIST_ID`
  - Visual feedback for valid/invalid URLs
  - Auto-extract video ID and display preview

#### FR2: Video Metadata Display
- **Description**: Show video information before processing
- **Requirements**:
  - Video title, thumbnail, channel name
  - Video duration and publish date
  - Transcript availability indicator
  - For channels/playlists: list of videos with selection interface

#### FR3: Processing Options Panel
- **Description**: Configure transcript processing settings
- **Requirements**:
  - Toggle switches for:
    - Speaker Detection (default: ON)
    - Deduplication (default: ON)
    - Text Normalization (default: ON)
    - Remove Timestamps (default: OFF)
  - Max segment length input (default: 1000 characters)
  - Real-time option changes with immediate re-processing
  - Clear visual indicators for active options

#### FR4: Processing Status & Progress
- **Description**: Show real-time processing status
- **Requirements**:
  - Loading states for:
    - URL validation
    - Transcript fetching
    - Processing (with progress percentage)
    - Export generation
  - Progress bar for transcript processing
  - Estimated time remaining
  - Cancel processing option
  - Error states with retry functionality

#### FR5: Transcript Viewer
- **Description**: Display processed transcript with rich formatting
- **Requirements**:
  - Speaker labels with visual distinction (Host/Guest)
  - Timestamp display (toggleable)
  - Search functionality within transcript
  - Copy-to-clipboard for selected text
  - Responsive layout (mobile-friendly)
  - Syntax highlighting for speaker labels
  - Scroll-to-segment functionality
  - Word count and duration statistics

#### FR6: Export Functionality
- **Description**: Export transcript in TXT format
- **Requirements**:
  - Export format: TXT (with options for metadata and timestamps)
  - Format selector (currently TXT only, other formats planned for future)
  - Include/exclude metadata toggle
  - Include/exclude timestamps toggle
  - One-click download
  - Filename auto-generation: `{video-title}_{format}.{ext}`

### 3.2 Advanced Features

#### FR8: Transcript History
- **Description**: Store and retrieve previously processed transcripts
- **Requirements**:
  - Local storage for recent transcripts (last 10)
  - History sidebar/dropdown
  - Quick re-process with different options
  - Clear history option

#### FR9: Transcript Editing
- **Description**: Manual editing capabilities
- **Requirements**:
  - Inline text editing
  - Manual speaker label assignment
  - Save edited transcript
  - Undo/redo functionality

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Page Load Time**: < 2 seconds initial load ✅
- **API Response Time**: < 500ms for transcript fetching ✅
- **Processing Time**: < 5 seconds for typical 1-hour podcast ✅
- **Real-time Updates**: UI updates within 100ms of state changes ✅
- **Tab Switching**: < 200ms for cached channel data (instant from cache) ✅
- **Cached Load**: < 100ms for previously viewed channel data ✅
- **API Optimization**: Parallel video metadata fetching for faster loading ✅

### 4.2 Usability
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile Responsiveness**: Fully functional on mobile devices
- **Error Messages**: Clear, actionable error messages
- **Loading States**: Always show loading indicators for async operations
- **Empty States**: Helpful messages when no data is available

### 4.3 Design Standards
- **Design System**: Apple/Airbnb leadership approval level UI/UX
- **Consistency**: Consistent spacing, typography, colors
- **Visual Hierarchy**: Clear information architecture
- **Dark Mode**: Full dark mode support
- **Responsive Breakpoints**: Mobile (< 640px), Tablet (640-1024px), Desktop (> 1024px)

### 4.4 Technical Requirements
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Type Safety**: 100% TypeScript coverage, zero `any` types
- **Error Handling**: Comprehensive error boundaries
- **Input Validation**: All user inputs validated and sanitized
- **Security**: XSS protection, input sanitization, secure API calls

---

## 5. User Interface Specifications

### 5.1 Page Layout

#### 5.1.1 Header
- Logo/Brand name
- Navigation (if multi-page)
- Theme toggle (light/dark)
- Settings icon (future)

#### 5.1.2 Main Content Area
- **Hero Section**:
  - Title: "YouTube Podcast Transcript Processor"
  - Subtitle: Brief description
  - URL input field (prominent, integrated with processing options)
  - Real-time URL validation

- **Two-Column Layout**:
  - **Left Column**: 
    - Processing Options Panel (with integrated URL input)
  - **Right Column**:
    - Video Preview Card with tabbed interface:
      - **Video Tab**: 
        - Video thumbnail and metadata (always visible)
        - "Process Transcript" button (when no transcript)
        - Full transcript display (after processing):
          - Statistics bar (word count, duration, speakers)
          - Transcript viewer with search
          - Export controls
          - Re-process button
      - **Channel Tab**:
        - Channel information card
        - Top 10 videos list (sorted by view count)
        - Video items with copy/paste URL functionality
    - Processing Status (during processing)
    - Loading States
    - Error Displays

- **Performance Features**:
  - Session-based caching for channel data (5-minute TTL)
  - Request deduplication
  - Component memoization
  - Parallel video metadata fetching

#### 5.1.3 Footer
- Links to documentation
- Version information
- Credits

### 5.2 Tab Structure

The application uses a tabbed interface within the Video Preview card:

#### Video Tab
- **Default State**: Shows video thumbnail, duration, and "Process Transcript" button
- **After Processing**: Shows full transcript with:
  - Statistics bar (word count, duration, speakers)
  - Search functionality
  - Transcript viewer with speaker labels
  - Export controls
  - Re-process button
- **Always Visible**: Video thumbnail and metadata remain visible at top

#### Channel Tab
- **Content**: Channel information and top 10 videos
- **Features**:
  - Channel name, description, video count
  - Top 10 videos sorted by view count
  - Video items with copy/paste URL functionality
  - External link to channel
- **Performance**: Uses session-based caching for instant tab switching
- **Mounting**: Uses forceMount to keep component mounted once viewed

### 5.3 Component Specifications

#### Component 1: URL Input Field
- **Type**: Text input with validation
- **Placeholder**: "Enter YouTube URL (video, channel, or playlist)"
- **Validation**: Real-time, inline error messages
- **Icons**: Checkmark (valid), X (invalid), loading spinner
- **Actions**: Auto-focus on page load, Enter key to submit

#### Component 2: Video Preview Card
- **Layout**: Card with tabbed interface (Video/Channel tabs)
- **Video Tab Content**: 
  - Thumbnail (always visible at top)
  - Duration and metadata
  - "Process Transcript" button (when no transcript)
  - Full transcript display (after processing)
- **Channel Tab Content**:
  - Channel information card
  - Top 10 videos list
- **Actions**: Process button, tab switching
- **States**: Loading, error, ready, processing
- **Performance**: Channel tab uses forceMount for caching

#### Component 3: Processing Options Panel
- **Layout**: Collapsible card with toggle switches
- **Options**: 
  - Speaker Detection (with info tooltip)
  - Deduplication (with info tooltip)
  - Text Normalization (with info tooltip)
  - Remove Timestamps (with info tooltip)
- **Advanced**: Max segment length input
- **Behavior**: Changes trigger re-processing

#### Component 4: Progress Indicator
- **Type**: Linear progress bar with percentage
- **States**: Idle, fetching, processing, complete, error
- **Information**: Current step, time elapsed, estimated remaining
- **Actions**: Cancel button (when processing)

#### Component 5: Transcript Viewer
- **Layout**: Scrollable container with formatted text
- **Formatting**:
  - Speaker labels: Bold, colored (Host: blue, Guest: green)
  - Timestamps: Muted, inline or sidebar
  - Paragraphs: Proper spacing
- **Features**:
  - Search bar (highlight matches)
  - Copy button
  - Scroll to top button
  - Word count display

#### Component 6: Export Controls
- **Layout**: Horizontal button group
- **Export Format**: TXT format (currently supported)
- **Options**: Checkboxes for metadata, timestamps
- **Action**: "Download" button (primary)
- **Feedback**: Success toast notification

#### Component 7: Channel Details
- **Layout**: Two-card layout (channel info + videos list)
- **Features**:
  - Channel name, description, video count
  - External link to channel
  - Top 10 videos list (sorted by view count)
  - Video items with copy/paste URL functionality
  - Session-based caching for performance
- **Performance**: Uses useChannelData hook with caching

### 5.3 Responsive Design

#### Mobile (< 640px)
- Single column layout
- Stacked components
- Full-width buttons
- Collapsible sections
- Bottom sheet for options

#### Tablet (640-1024px)
- Two-column layout where appropriate
- Side-by-side video preview and options
- Maintained spacing and readability

#### Desktop (> 1024px)
- Multi-column layout
- Sidebar for options (optional)
- Maximum content width: 1200px
- Optimal use of screen space

---

## 6. User Flows

### Flow 1: Single Video Processing (Happy Path)
```
1. User lands on homepage
2. User enters YouTube video URL in processing options panel
3. System validates URL (instant feedback)
4. System fetches video metadata and transcript
5. Video preview card appears in right column with Video tab active
6. Video tab shows: thumbnail, duration, and "Process Transcript" button
7. User reviews processing options (defaults shown in left panel)
8. User clicks "Process Transcript"
9. Progress indicator shows: "Processing transcript..." (with %)
10. Transcript appears in Video tab with statistics
11. User can search within transcript, toggle timestamps
12. User switches to Channel tab to see top 10 videos (cached for fast switching)
13. User switches back to Video tab
14. User selects export format (TXT) from export controls
15. User clicks "Download"
16. File downloads successfully
```

### Flow 2: Channel/Playlist Browsing
```
1. User enters channel or playlist URL
2. System detects URL type and shows detection message
3. User navigates to Channel or Playlist tab
4. System displays top 10 videos with metadata
5. User clicks "Copy URL" on a video
6. User clicks "Paste URL" button
7. Video URL is pasted into input field
8. User clicks "Process Transcript"
9. Transcript is processed and displayed
```

### Flow 3: Error Handling
```
1. User enters invalid URL
2. Inline error: "Invalid YouTube URL. Please check and try again."
3. User corrects URL
4. Validation passes
5. User clicks "Process"
6. Error occurs: "Transcript not available for this video"
7. Error message appears with:
   - Clear explanation
   - Possible reasons
   - Retry button
   - Alternative suggestions
```

---

## 7. Success Metrics

### 7.1 User Engagement
- **Time to First Transcript**: < 30 seconds
- **Processing Success Rate**: > 95%
- **Export Usage**: > 80% of processed transcripts exported
- **Return User Rate**: > 40% (users process multiple videos)

### 7.2 Performance Metrics
- **Average Processing Time**: < 5 seconds per video
- **Page Load Performance**: Lighthouse score > 90
- **Error Rate**: < 5% of processing attempts
- **API Success Rate**: > 98%

### 7.3 User Satisfaction
- **Task Completion Rate**: > 90%
- **User Error Rate**: < 10% (user-caused errors)
- **Support Requests**: < 2% of users

---

## 8. Out of Scope (v1.0)

- User authentication/accounts
- Cloud storage of transcripts
- Collaborative editing
- API access for developers
- Mobile native apps
- Browser extensions
- Real-time transcript streaming
- AI-powered summarization
- Translation features
- Custom speaker name editing (beyond Host/Guest)

---

## 9. Future Enhancements (v2.0+)

- User accounts and transcript history
- Cloud storage integration
- Advanced speaker identification (ML-based)
- Transcript summarization
- Multi-language support
- API access
- Browser extension
- Integration with note-taking apps

---

## 10. Dependencies & Constraints

### 10.1 Technical Dependencies
- Next.js 15+ (App Router) ✅
- React 19+ ✅
- TypeScript 5+ ✅
- Tailwind CSS 4+ ✅
- shadcn/ui components ✅
- yt-dlp for transcript extraction ✅
- Radix UI primitives (for tabs, dropdowns, etc.) ✅

### 10.2 Constraints
- YouTube API rate limits
- Transcript availability (not all videos have transcripts)
- Client-side processing (browser limitations)
- No backend storage (localStorage only)

### 10.3 Assumptions
- Users have modern browsers
- YouTube videos have available transcripts
- Users understand basic YouTube URL formats
- Processing happens client-side (no server required initially)

---

## 11. Risk Assessment

### Risk 1: YouTube Transcript Availability
- **Impact**: High - Core functionality depends on transcript availability
- **Mitigation**: Clear error messages, alternative suggestions, support for manual transcript upload (future)

### Risk 2: Processing Performance
- **Impact**: Medium - Long videos may take time to process
- **Mitigation**: Progress indicators, estimated time, optimization of processing algorithms

### Risk 3: Browser Compatibility
- **Impact**: Low - Modern browsers required
- **Mitigation**: Progressive enhancement, feature detection, clear browser requirements

### Risk 4: API Rate Limiting
- **Impact**: Medium - YouTube API may rate limit requests
- **Mitigation**: Client-side caching, request rate limiting, clear error messages

---

## 12. Approval & Sign-off

### Stakeholders
- **Product Owner**: [TBD]
- **Engineering Lead**: [TBD]
- **Design Lead**: [TBD]

### Approval Status
- [ ] Product Owner Approval
- [ ] Engineering Review
- [ ] Design Review
- [ ] Final Approval

---

**Document Version History**
- v1.0 (2025-01-27): Initial PRD creation
- v1.1 (2025-01-27): Updated to reflect current implementation status, performance optimizations, and tabbed interface



