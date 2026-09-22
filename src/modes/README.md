# Ink Vault — 3-Way Domain Folder Architecture

Ink Vault follows a domain-driven, feature-sliced 3-way folder architecture for its primary workflow modes:

```
src/modes/
├── studio/                     # 🎨 Mode 1: Studio Editor Domain
│   ├── components/
│   │   ├── StudioSidebar.tsx   # Studio sidebar navigation (Viewer, Recents, Offline Tools)
│   │   ├── StudioRecentView.tsx# Studio document grid & quick actions
│   │   └── tools/              # Dedicated offline PDF manipulation tools
│   │       ├── CompressTool.tsx
│   │       ├── MergeTool.tsx
│   │       ├── ProtectTool.tsx
│   │       ├── SplitTool.tsx
│   │       └── WatermarkTool.tsx
│   ├── types/
│   │   └── index.ts            # Studio tool IDs and definitions
│   └── index.ts                # Public domain barrel export
│
├── study/                      # 🎓 Mode 2: Study Mode Domain
│   ├── components/
│   │   ├── StudySidebar.tsx    # Study sidebar (Subjects list, inline tree, import action)
│   │   ├── StudyDashboard.tsx  # Subject cards, explorer & coursework manager
│   │   ├── FolderTreeExplorer.tsx # VS Code-style recursive subject tree
│   │   ├── StudySubjectSetupCard.tsx # Empty subject onboarding card
│   │   └── SubjectFolderModal.tsx # Subject folder creation/tagging modal
│   ├── context/
│   │   └── PomodoroContext.tsx # Pomodoro session timer, audio chime, and break intervals
│   ├── types/
│   │   └── index.ts            # StudySubject, PomodoroState, Folder scan types
│   └── index.ts                # Public domain barrel export
│
├── reader/                     # 📚 Mode 3: Books & Comics Domain
│   ├── components/
│   │   ├── ReaderSidebar.tsx   # Reader sidebar navigation
│   │   ├── BookComicHub.tsx    # Search, Streak/Weekly Stats, Continue Reading Hero, Shelf Grid
│   │   └── CircularProgress.tsx# Circular SVG progress ring indicator
│   ├── loaders/
│   │   ├── comicLoader.ts      # CBZ / CBR / CBN extraction & cover generator
│   │   └── epubLoader.ts       # EPUB zip unpacker & cover parser
│   ├── utils/
│   │   └── readingStats.ts     # Reading streaks, weekly pages, time & star ratings
│   ├── types/
│   │   └── index.ts            # ReadingStatistics, Comic/EPUB metadata types
│   └── index.ts                # Public domain barrel export
│
└── index.ts                    # Master workflow modes registry and barrel export
```

### Architecture Principles
1. **Domain Isolation**: Each mode owns its components, tools, loaders, context, and types. Modifying one mode never causes regressions in others.
2. **Backward Compatibility**: Existing imports (e.g. `src/components/study/*`, `src/components/tools/*`, `src/components/reader/*`, `src/context/PomodoroContext.tsx`) re-export from `src/modes/`.
3. **Lean Orchestration**: `src/pages/WorkspacePage.tsx` acts purely as a coordinator delegating layout and views to active domain modules.
