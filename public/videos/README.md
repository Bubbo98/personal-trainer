# Video Storage

This directory contains video files organized by categories:

- `calisthenics/` - Calisthenics training videos
- `bodyweight/` - Bodyweight workout videos
- `recovery/` - Recovery and stretching videos

## File Structure
```
videos/
├── calisthenics/
│   ├── intro.mp4
│   └── ...
├── bodyweight/
│   ├── full-workout.mp4
│   └── ...
└── recovery/
    ├── post-workout-stretch.mp4
    └── ...
```

## Adding New Videos
1. Upload video files to the appropriate category folder
2. Add video metadata to the database via admin API
3. Grant user permissions via admin API

## Security Note
Videos in this directory are publicly accessible via direct URL.
Access control is handled at the application level through the backend API.