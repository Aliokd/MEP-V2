export interface Word {
    text: string;
    start: number;
    end: number;
}

export interface LyricLine {
    words: Word[];
}

export interface LyricSection {
    title: string;
    lines: LyricLine[];
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
    lyrics: LyricSection[];
}

export const SAMPLE_SONGS: Song[] = [
    {
        id: "song-2",
        title: "Shape of You",
        artist: "Ed Sheeran",
        audioUrl: "/shape_of_you.mp3",
        lyrics: [
    {
    title: "Verse 1",
    lines: [
    {
    words: [
    { text: "The", start: 16.0, end: 16.2 },
    { text: "club", start: 16.2, end: 16.5 },
    { text: "isn't", start: 16.5, end: 16.8 },
    { text: "the", start: 16.8, end: 17.0 },
    { text: "best", start: 17.0, end: 17.3 },
    { text: "place", start: 17.3, end: 17.6 },
    { text: "to", start: 17.6, end: 17.8 },
    { text: "find", start: 17.8, end: 18.1 },
    { text: "a", start: 18.1, end: 18.3 },
    { text: "lover", start: 18.3, end: 18.7 }
    ]
    },
    {
    words: [
    { text: "So", start: 18.8, end: 19.0 },
    { text: "the", start: 19.0, end: 19.2 },
    { text: "bar", start: 19.2, end: 19.5 },
    { text: "is", start: 19.5, end: 19.7 },
    { text: "where", start: 19.7, end: 20.0 },
    { text: "I", start: 20.0, end: 20.2 },
    { text: "go", start: 20.2, end: 20.6 }
    ]
    },
    {
    words: [
    { text: "Me", start: 21.0, end: 21.2 },
    { text: "and", start: 21.2, end: 21.4 },
    { text: "my", start: 21.4, end: 21.7 },
    { text: "friends", start: 21.7, end: 22.0 },
    { text: "at", start: 22.0, end: 22.2 },
    { text: "the", start: 22.2, end: 22.4 },
    { text: "table", start: 22.4, end: 22.8 },
    { text: "doin'", start: 22.8, end: 23.2 },
    { text: "shots", start: 23.2, end: 23.6 }
    ]
    },
    {
    words: [
    { text: "Drinkin'", start: 23.8, end: 24.2 },
    { text: "fast", start: 24.2, end: 24.5 },
    { text: "and", start: 24.5, end: 24.7 },
    { text: "then", start: 24.7, end: 24.9 },
    { text: "we", start: 24.9, end: 25.1 },
    { text: "talk", start: 25.1, end: 25.4 },
    { text: "slow", start: 25.4, end: 25.8 }
    ]
    }
    ]
    },
    {
    title: "Pre-Chorus",
    lines: [
    {
    words: [
    { text: "And", start: 26.2, end: 26.4 },
    { text: "you", start: 26.4, end: 26.6 },
    { text: "come", start: 26.6, end: 26.9 },
    { text: "over", start: 26.9, end: 27.2 },
    { text: "and", start: 27.2, end: 27.4 },
    { text: "start", start: 27.4, end: 27.7 },
    { text: "up", start: 27.7, end: 27.9 },
    { text: "a", start: 27.9, end: 28.1 },
    { text: "conversation", start: 28.1, end: 28.7 },
    { text: "with", start: 28.7, end: 29.0 },
    { text: "just", start: 29.0, end: 29.2 },
    { text: "me", start: 29.2, end: 29.6 }
    ]
    },
    {
    words: [
    { text: "And", start: 29.8, end: 30.0 },
    { text: "trust", start: 30.0, end: 30.3 },
    { text: "me", start: 30.3, end: 30.6 },
    { text: "I'll", start: 30.6, end: 30.9 },
    { text: "give", start: 30.9, end: 31.2 },
    { text: "it", start: 31.2, end: 31.4 },
    { text: "a", start: 31.4, end: 31.6 },
    { text: "chance", start: 31.6, end: 31.9 },
    { text: "now", start: 31.9, end: 32.3 }
    ]
    },
    {
    words: [
    { text: "Take", start: 32.5, end: 32.8 },
    { text: "my", start: 32.8, end: 33.0 },
    { text: "hand,", start: 33.0, end: 33.3 },
    { text: "stop,", start: 33.3, end: 33.6 },
    { text: "put", start: 33.6, end: 33.9 },
    { text: "Van", start: 33.9, end: 34.2 },
    { text: "the", start: 34.2, end: 34.4 },
    { text: "Man", start: 34.4, end: 34.7 },
    { text: "on", start: 34.7, end: 34.9 },
    { text: "the", start: 34.9, end: 35.1 },
    { text: "jukebox", start: 35.1, end: 35.6 }
    ]
    }
    ]
    },
    {
    title: "Build Up",
    lines: [
    {
    words: [
    { text: "Girl,", start: 41.0, end: 41.3 },
    { text: "you", start: 41.3, end: 41.6 },
    { text: "know", start: 41.6, end: 41.9 },
    { text: "I", start: 41.9, end: 42.1 },
    { text: "want", start: 42.1, end: 42.4 },
    { text: "your", start: 42.4, end: 42.6 },
    { text: "love", start: 42.6, end: 43.0 }
    ]
    },
    {
    words: [
    { text: "Your", start: 43.5, end: 43.8 },
    { text: "love", start: 43.8, end: 44.1 },
    { text: "was", start: 44.1, end: 44.3 },
    { text: "handmade", start: 44.3, end: 44.8 },
    { text: "for", start: 44.8, end: 45.1 },
    { text: "somebody", start: 45.1, end: 45.6 },
    { text: "like", start: 45.6, end: 45.9 },
    { text: "me", start: 45.9, end: 46.3 }
    ]
    },
    {
    words: [
    { text: "Come", start: 46.5, end: 46.8 },
    { text: "on", start: 46.8, end: 47.0 },
    { text: "now,", start: 47.0, end: 47.3 },
    { text: "follow", start: 47.3, end: 47.6 },
    { text: "my", start: 47.6, end: 47.8 },
    { text: "lead", start: 47.8, end: 48.2 }
    ]
    }
    ]
    },
    {
    title: "Chorus",
    lines: [
    {
    words: [
    { text: "I'm", start: 56.0, end: 56.2 },
    { text: "in", start: 56.2, end: 56.4 },
    { text: "love", start: 56.4, end: 56.7 },
    { text: "with", start: 56.7, end: 56.9 },
    { text: "the", start: 56.9, end: 57.1 },
    { text: "shape", start: 57.1, end: 57.4 },
    { text: "of", start: 57.4, end: 57.6 },
    { text: "you", start: 57.6, end: 58.0 }
    ]
    },
    {
    words: [
    { text: "We", start: 58.5, end: 58.7 },
    { text: "push", start: 58.7, end: 59.0 },
    { text: "and", start: 59.0, end: 59.2 },
    { text: "pull", start: 59.2, end: 59.5 },
    { text: "like", start: 59.5, end: 59.7 },
    { text: "a", start: 59.7, end: 59.9 },
    { text: "magnet", start: 59.9, end: 60.3 },
    { text: "do", start: 60.3, end: 60.7 }
    ]
    }
    ]
    }
        ]
    },
    {
        id: "song-3",
        title: "Do You Love",
        artist: "Peter Nordberg",
        audioUrl: "/Do You Love - Peter Nordberg.mp3",
        lyrics: [
          {
    title: "Verse 1",
    lines: [
    {
    words: [
    {
    text: "You.",
    start: 6.24,
    end: 6.48
    }
    ]
    },
    {
    words: [
    {
    text: "I",
    start: 9.04,
    end: 9.4
    },
    {
    text: "wanna",
    start: 9.4,
    end: 9.72
    },
    {
    text: "spend",
    start: 10,
    end: 10.36
    },
    {
    text: "a",
    start: 10.36,
    end: 10.64
    },
    {
    text: "day",
    start: 10.64,
    end: 10.96
    },
    {
    text: "with.",
    start: 10.96,
    end: 11.32
    }
    ]
    },
    {
    words: [
    {
    text: "You.",
    start: 11.32,
    end: 11.68
    }
    ]
    },
    {
    words: [
    {
    text: "And",
    start: 14.24,
    end: 14.6
    },
    {
    text: "I",
    start: 14.6,
    end: 14.88
    },
    {
    text: "don't",
    start: 14.88,
    end: 15.2
    },
    {
    text: "care",
    start: 15.2,
    end: 15.48
    },
    {
    text: "just",
    start: 15.48,
    end: 15.8
    },
    {
    text: "what",
    start: 15.8,
    end: 16.12
    },
    {
    text: "we",
    start: 16.12,
    end: 16.48
    },
    {
    text: "do.",
    start: 16.48,
    end: 16.88
    }
    ]
    },
    {
    words: [
    {
    text: "It's",
    start: 18.64,
    end: 19.12
    },
    {
    text: "true.",
    start: 19.12,
    end: 19.52
    }
    ]
    },
    {
    words: [
    {
    text: "Tonight",
    start: 24,
    end: 24.72
    }
    ]
    },
    {
    words: [
    {
    text: "we",
    start: 27.04,
    end: 27.4
    },
    {
    text: "stay",
    start: 27.4,
    end: 27.76
    },
    {
    text: "at",
    start: 27.76,
    end: 28.08
    },
    {
    text: "home,",
    start: 28.08,
    end: 28.36
    }
    ]
    },
    {
    words: [
    {
    text: "turn",
    start: 28.36,
    end: 28.72
    },
    {
    text: "down",
    start: 28.72,
    end: 29.08
    },
    {
    text: "the",
    start: 29.08,
    end: 29.4
    },
    {
    text: "lights.",
    start: 29.4,
    end: 29.76
    }
    ]
    },
    {
    words: [
    {
    text: "And",
    start: 32.38,
    end: 32.62
    },
    {
    text: "maybe",
    start: 32.62,
    end: 33.18
    },
    {
    text: "hold",
    start: 33.26,
    end: 33.66
    },
    {
    text: "each",
    start: 33.66,
    end: 34.02
    },
    {
    text: "other",
    start: 34.02,
    end: 34.38
    },
    {
    text: "tight",
    start: 34.54,
    end: 35.1
    }
    ]
    },
    {
    words: [
    {
    text: "all",
    start: 36.78,
    end: 37.18
    },
    {
    text: "night.",
    start: 37.18,
    end: 37.58
    }
    ]
    }
    ]
          },
          {
    title: "Chorus",
    lines: [
    {
    words: [
    {
    text: "Do",
    start: 41.58,
    end: 41.86
    },
    {
    text: "you",
    start: 41.86,
    end: 42.1
    },
    {
    text: "love?",
    start: 42.1,
    end: 42.46
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 45.74,
    end: 46.06
    },
    {
    text: "you",
    start: 46.06,
    end: 46.3
    },
    {
    text: "feel",
    start: 46.3,
    end: 46.62
    },
    {
    text: "it",
    start: 46.62,
    end: 47.02
    },
    {
    text: "from",
    start: 47.02,
    end: 47.34
    },
    {
    text: "above?",
    start: 47.34,
    end: 47.82
    }
    ]
    },
    {
    words: [
    {
    text: "Is",
    start: 50.94,
    end: 51.26
    },
    {
    text: "it",
    start: 51.26,
    end: 51.5
    },
    {
    text: "coming",
    start: 51.5,
    end: 51.82
    },
    {
    text: "from",
    start: 52.3,
    end: 52.7
    },
    {
    text: "below?",
    start: 52.7,
    end: 53.1
    }
    ]
    },
    {
    words: [
    {
    text: "From",
    start: 56.06,
    end: 56.38
    },
    {
    text: "the",
    start: 56.38,
    end: 56.62
    },
    {
    text: "deepest",
    start: 56.62,
    end: 57.34
    },
    {
    text: "of",
    start: 57.5,
    end: 57.86
    },
    {
    text: "your",
    start: 57.86,
    end: 58.22
    },
    {
    text: "soul?",
    start: 58.3,
    end: 58.86
    }
    ]
    }
    ]
          },
          {
    title: "Verse 2",
    lines: [
    {
    words: [
    {
    text: "Stay",
    start: 65.56,
    end: 65.8
    }
    ]
    },
    {
    words: [
    {
    text: "and",
    start: 68.44,
    end: 68.8
    },
    {
    text: "try",
    start: 68.8,
    end: 69.12
    },
    {
    text: "to",
    start: 69.12,
    end: 69.44
    },
    {
    text: "find",
    start: 69.44,
    end: 69.8
    },
    {
    text: "another",
    start: 69.88,
    end: 70.28
    },
    {
    text: "way.",
    start: 70.76,
    end: 71.16
    }
    ]
    },
    {
    words: [
    {
    text: "Just",
    start: 73.72,
    end: 74.12
    },
    {
    text: "don't",
    start: 74.2,
    end: 74.6
    },
    {
    text: "swive",
    start: 74.6,
    end: 75
    },
    {
    text: "and",
    start: 75,
    end: 75.28
    },
    {
    text: "like",
    start: 75.28,
    end: 75.64
    },
    {
    text: "and",
    start: 75.64,
    end: 75.96
    },
    {
    text: "play",
    start: 75.96,
    end: 76.28
    }
    ]
    },
    {
    words: [
    {
    text: "all",
    start: 78.2,
    end: 78.56
    },
    {
    text: "day.",
    start: 78.56,
    end: 78.92
    }
    ]
    },
    {
    words: [
    {
    text: "You",
    start: 83.24,
    end: 83.64
    },
    {
    text: "know,",
    start: 83.64,
    end: 84.04
    }
    ]
    },
    {
    words: [
    {
    text: "don't",
    start: 86.6,
    end: 87
    },
    {
    text: "let",
    start: 87,
    end: 87.24
    },
    {
    text: "them",
    start: 87.24,
    end: 87.56
    },
    {
    text: "say",
    start: 87.56,
    end: 87.92
    },
    {
    text: "I",
    start: 87.92,
    end: 88.24
    },
    {
    text: "told",
    start: 88.24,
    end: 88.56
    },
    {
    text: "you",
    start: 88.56,
    end: 88.92
    },
    {
    text: "so.",
    start: 88.92,
    end: 89.32
    }
    ]
    },
    {
    words: [
    {
    text: "Just",
    start: 91.72,
    end: 92.12
    },
    {
    text: "let",
    start: 92.12,
    end: 92.48
    },
    {
    text: "it",
    start: 92.48,
    end: 92.8
    },
    {
    text: "out",
    start: 92.8,
    end: 93.12
    },
    {
    text: "and",
    start: 93.12,
    end: 93.44
    },
    {
    text: "let",
    start: 93.44,
    end: 93.76
    },
    {
    text: "it",
    start: 93.76,
    end: 94.04
    },
    {
    text: "flow.",
    start: 94.04,
    end: 94.44
    }
    ]
    },
    {
    words: [
    {
    text: "Let's",
    start: 96.44,
    end: 96.72
    },
    {
    text: "go.",
    start: 96.72,
    end: 97
    }
    ]
    }
    ]
          },
          {
    title: "Chorus",
    lines: [
    {
    words: [
    {
    text: "Do",
    start: 101.08,
    end: 101.36
    },
    {
    text: "you",
    start: 101.36,
    end: 101.56
    },
    {
    text: "love?",
    start: 101.56,
    end: 101.88
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 105.24,
    end: 105.52
    },
    {
    text: "you",
    start: 105.52,
    end: 105.76
    },
    {
    text: "feel",
    start: 105.76,
    end: 106.12
    },
    {
    text: "it",
    start: 106.12,
    end: 106.52
    },
    {
    text: "from",
    start: 106.52,
    end: 106.84
    },
    {
    text: "above?",
    start: 106.84,
    end: 107.4
    }
    ]
    },
    {
    words: [
    {
    text: "Is",
    start: 110.44,
    end: 110.76
    },
    {
    text: "it",
    start: 110.76,
    end: 111
    },
    {
    text: "coming",
    start: 111,
    end: 111.32
    },
    {
    text: "from",
    start: 111.8,
    end: 112.2
    },
    {
    text: "below?",
    start: 112.2,
    end: 112.6
    }
    ]
    },
    {
    words: [
    {
    text: "From",
    start: 115.56,
    end: 115.88
    },
    {
    text: "the",
    start: 115.88,
    end: 116.12
    },
    {
    text: "deepest",
    start: 116.12,
    end: 116.84
    },
    {
    text: "of",
    start: 117,
    end: 117.36
    },
    {
    text: "your",
    start: 117.36,
    end: 117.72
    },
    {
    text: "soul?",
    start: 117.72,
    end: 118.28
    }
    ]
    }
    ]
          },
          {
    title: "Outro",
    lines: [
    {
    words: [
    {
    text: "Do",
    start: 122.82,
    end: 122.98
    },
    {
    text: "you",
    start: 122.98,
    end: 123.18
    },
    {
    text: "love,",
    start: 123.18,
    end: 123.42
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 123.42,
    end: 123.66
    },
    {
    text: "you",
    start: 123.66,
    end: 123.82
    },
    {
    text: "love?",
    start: 123.82,
    end: 124.06
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 124.06,
    end: 124.3
    },
    {
    text: "you",
    start: 124.3,
    end: 124.46
    },
    {
    text: "love?",
    start: 124.46,
    end: 124.7
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 124.7,
    end: 124.94
    },
    {
    text: "you",
    start: 124.94,
    end: 125.14
    },
    {
    text: "love?",
    start: 125.14,
    end: 125.46
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 127.86,
    end: 128.14
    },
    {
    text: "you",
    start: 128.14,
    end: 128.3
    },
    {
    text: "love?",
    start: 128.3,
    end: 128.54
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 128.54,
    end: 128.78
    },
    {
    text: "you",
    start: 128.78,
    end: 128.98
    },
    {
    text: "love,",
    start: 128.98,
    end: 129.22
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 129.22,
    end: 129.42
    },
    {
    text: "you",
    start: 129.42,
    end: 129.62
    },
    {
    text: "love,",
    start: 129.62,
    end: 129.9
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 129.9,
    end: 130.14
    },
    {
    text: "you",
    start: 130.14,
    end: 130.3
    },
    {
    text: "love?",
    start: 130.3,
    end: 130.58
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 132.1,
    end: 132.42
    },
    {
    text: "you",
    start: 132.42,
    end: 132.74
    },
    {
    text: "love?",
    start: 132.74,
    end: 133.1
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 133.1,
    end: 133.34
    },
    {
    text: "you",
    start: 133.34,
    end: 133.54
    },
    {
    text: "love,",
    start: 133.54,
    end: 133.78
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 133.78,
    end: 133.98
    },
    {
    text: "you",
    start: 133.98,
    end: 134.14
    },
    {
    text: "love,",
    start: 134.14,
    end: 134.38
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 134.38,
    end: 134.62
    },
    {
    text: "you",
    start: 134.62,
    end: 134.82
    },
    {
    text: "love,",
    start: 134.82,
    end: 135.1
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 135.1,
    end: 135.3
    },
    {
    text: "you",
    start: 135.3,
    end: 135.46
    },
    {
    text: "love?",
    start: 135.46,
    end: 135.78
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 136.26,
    end: 136.58
    },
    {
    text: "you",
    start: 136.58,
    end: 136.78
    },
    {
    text: "feel",
    start: 136.78,
    end: 137.06
    },
    {
    text: "it",
    start: 137.14,
    end: 137.54
    },
    {
    text: "from",
    start: 137.54,
    end: 137.86
    },
    {
    text: "above?",
    start: 137.86,
    end: 138.26
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 138.26,
    end: 138.54
    },
    {
    text: "you",
    start: 138.54,
    end: 138.74
    },
    {
    text: "love,",
    start: 138.74,
    end: 138.94
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 138.94,
    end: 139.18
    },
    {
    text: "you",
    start: 139.18,
    end: 139.34
    },
    {
    text: "love,",
    start: 139.34,
    end: 139.58
    }
    ]
    },
    {
    words: [
    {
    text: "do",
    start: 139.58,
    end: 139.82
    },
    {
    text: "you",
    start: 139.82,
    end: 139.98
    },
    {
    text: "love?",
    start: 139.98,
    end: 140.22
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 140.22,
    end: 140.46
    },
    {
    text: "you",
    start: 140.46,
    end: 140.66
    },
    {
    text: "love?",
    start: 140.66,
    end: 140.98
    }
    ]
    },
    {
    words: [
    {
    text: "Do",
    start: 142.5,
    end: 142.78
    },
    {
    text: "you",
    start: 142.78,
    end: 143.06
    }
    ]
    }
    ]
          }
]
    }
];
