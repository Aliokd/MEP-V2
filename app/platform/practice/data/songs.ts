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
                            { text: "You.", start: 9, end: 9.24 }
                        ]
                    },
                    {
                        words: [
                            { text: "I", start: 11.8, end: 12.16 },
                            { text: "wanna", start: 12.16, end: 12.48 },
                            { text: "spend", start: 12.76, end: 13.12 },
                            { text: "a", start: 13.12, end: 13.4 },
                            { text: "day", start: 13.4, end: 13.72 },
                            { text: "with.", start: 13.72, end: 14.08 },
                            { text: "You.", start: 14.08, end: 14.44 }
                        ]
                    },
                    {
                        words: [
                            { text: "And", start: 17, end: 17.36 },
                            { text: "I", start: 17.36, end: 17.64 },
                            { text: "don't", start: 17.64, end: 17.96 },
                            { text: "care", start: 17.96, end: 18.24 },
                            { text: "just", start: 18.24, end: 18.56 },
                            { text: "what", start: 18.56, end: 18.88 },
                            { text: "we", start: 18.88, end: 19.24 },
                            { text: "do.", start: 19.24, end: 19.64 }
                        ]
                    },
                    {
                        words: [
                            { text: "It's", start: 21.4, end: 21.88 },
                            { text: "true.", start: 21.88, end: 22.28 }
                        ]
                    },
                    {
                        words: [
                            { text: "Tonight", start: 26.76, end: 27.48 },
                            { text: "we", start: 29.8, end: 30.16 },
                            { text: "stay", start: 30.16, end: 30.52 },
                            { text: "at", start: 30.52, end: 30.84 },
                            { text: "home,", start: 30.84, end: 31.12 },
                            { text: "turn", start: 31.12, end: 31.48 },
                            { text: "down", start: 31.48, end: 31.84 },
                            { text: "the", start: 31.84, end: 32.16 },
                            { text: "lights.", start: 32.16, end: 32.52 }
                        ]
                    },
                    {
                        words: [
                            { text: "And", start: 35.14, end: 35.38 },
                            { text: "maybe", start: 35.38, end: 35.94 },
                            { text: "hold", start: 36.02, end: 36.42 },
                            { text: "each", start: 36.42, end: 36.78 },
                            { text: "other", start: 36.78, end: 37.14 },
                            { text: "tight", start: 37.3, end: 37.86 },
                            { text: "all", start: 39.54, end: 39.94 },
                            { text: "night.", start: 39.94, end: 40.34 }
                        ]
                    }
                ]
            },
            {
                title: "Chorus",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 44.34, end: 44.62 },
                            { text: "you", start: 44.62, end: 44.86 },
                            { text: "love?", start: 44.86, end: 45.22 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 48.5, end: 48.82 },
                            { text: "you", start: 48.82, end: 49.06 },
                            { text: "feel", start: 49.06, end: 49.38 },
                            { text: "it", start: 49.38, end: 49.78 },
                            { text: "from", start: 49.78, end: 50.1 },
                            { text: "above?", start: 50.1, end: 50.58 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 53.7, end: 54.02 },
                            { text: "it", start: 54.02, end: 54.26 },
                            { text: "coming", start: 54.26, end: 54.58 },
                            { text: "from", start: 55.06, end: 55.46 },
                            { text: "below?", start: 55.46, end: 55.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 58.82, end: 59.14 },
                            { text: "the", start: 59.14, end: 59.38 },
                            { text: "deepest", start: 59.38, end: 60.1 },
                            { text: "of", start: 60.26, end: 60.62 },
                            { text: "your", start: 60.62, end: 60.98 },
                            { text: "soul?", start: 61.06, end: 61.62 }
                        ]
                    }
                ]
            },
            {
                title: "Verse 2",
                lines: [
                    {
                        words: [
                            { text: "Stay", start: 68.32, end: 68.56 },
                            { text: "and", start: 71.2, end: 71.56 },
                            { text: "try", start: 71.56, end: 71.88 },
                            { text: "to", start: 71.88, end: 72.2 },
                            { text: "find", start: 72.2, end: 72.56 },
                            { text: "another", start: 72.64, end: 73.04 },
                            { text: "way.", start: 73.52, end: 73.92 }
                        ]
                    },
                    {
                        words: [
                            { text: "Just", start: 76.48, end: 76.88 },
                            { text: "don't", start: 76.96, end: 77.36 },
                            { text: "swive", start: 77.36, end: 77.76 },
                            { text: "and", start: 77.76, end: 78.04 },
                            { text: "like", start: 78.04, end: 78.4 },
                            { text: "and", start: 78.4, end: 78.72 },
                            { text: "play", start: 78.72, end: 79.04 },
                            { text: "all", start: 80.96, end: 81.32 },
                            { text: "day.", start: 81.32, end: 81.68 }
                        ]
                    },
                    {
                        words: [
                            { text: "You", start: 86, end: 86.4 },
                            { text: "know,", start: 86.4, end: 86.8 },
                            { text: "don't", start: 89.36, end: 89.76 },
                            { text: "let", start: 89.76, end: 90 },
                            { text: "them", start: 90, end: 90.32 },
                            { text: "say", start: 90.32, end: 90.68 },
                            { text: "I", start: 90.68, end: 91 },
                            { text: "told", start: 91, end: 91.32 },
                            { text: "you", start: 91.32, end: 91.68 },
                            { text: "so.", start: 91.68, end: 92.08 }
                        ]
                    },
                    {
                        words: [
                            { text: "Just", start: 94.48, end: 94.88 },
                            { text: "let", start: 94.86, end: 95.24 },
                            { text: "it", start: 95.24, end: 95.56 },
                            { text: "out", start: 95.56, end: 95.88 },
                            { text: "and", start: 95.88, end: 96.2 },
                            { text: "let", start: 96.2, end: 96.52 },
                            { text: "it", start: 96.52, end: 96.8 },
                            { text: "flow.", start: 96.8, end: 97.2 }
                        ]
                    },
                    {
                        words: [
                            { text: "Let's", start: 99.2, end: 99.48 },
                            { text: "go.", start: 99.48, end: 99.76 }
                        ]
                    }
                ]
            },
            {
                title: "Chorus",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 103.84, end: 104.12 },
                            { text: "you", start: 104.12, end: 104.32 },
                            { text: "love?", start: 104.32, end: 104.64 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 108, end: 108.28 },
                            { text: "you", start: 108.28, end: 108.52 },
                            { text: "feel", start: 108.52, end: 108.88 },
                            { text: "it", start: 108.88, end: 109.28 },
                            { text: "from", start: 109.28, end: 109.6 },
                            { text: "above?", start: 109.6, end: 110.16 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 113.2, end: 113.52 },
                            { text: "it", start: 113.52, end: 113.76 },
                            { text: "coming", start: 113.76, end: 114.08 },
                            { text: "from", start: 114.56, end: 114.96 },
                            { text: "below?", start: 114.96, end: 115.36 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 118.32, end: 118.64 },
                            { text: "the", start: 118.64, end: 118.88 },
                            { text: "deepest", start: 118.88, end: 119.6 },
                            { text: "of", start: 119.76, end: 120.12 },
                            { text: "your", start: 120.12, end: 120.48 },
                            { text: "soul?", start: 120.48, end: 121.04 }
                        ]
                    }
                ]
            },
            {
                title: "Outro",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 125.58, end: 125.74 },
                            { text: "you", start: 125.74, end: 125.94 },
                            { text: "love,", start: 125.94, end: 126.18 },
                            { text: "do", start: 126.18, end: 126.42 },
                            { text: "you", start: 126.42, end: 126.58 },
                            { text: "love?", start: 126.58, end: 126.82 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 126.82, end: 127.06 },
                            { text: "you", start: 127.06, end: 127.22 },
                            { text: "love?", start: 127.22, end: 127.46 },
                            { text: "Do", start: 127.46, end: 127.7 },
                            { text: "you", start: 127.7, end: 127.9 },
                            { text: "love?", start: 127.9, end: 128.22 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 134.86, end: 135.18 },
                            { text: "you", start: 135.18, end: 135.5 },
                            { text: "love?", start: 135.5, end: 135.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 139.02, end: 139.34 },
                            { text: "you", start: 139.34, end: 139.54 },
                            { text: "feel", start: 139.54, end: 139.82 },
                            { text: "it", start: 139.9, end: 140.3 },
                            { text: "from", start: 140.3, end: 140.62 },
                            { text: "above?", start: 140.62, end: 141.02 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 154.54, end: 154.86 },
                            { text: "it", start: 154.86, end: 155.1 },
                            { text: "coming", start: 155.1, end: 155.42 },
                            { text: "from", start: 155.9, end: 156.3 },
                            { text: "below?", start: 156.46, end: 156.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 159.72, end: 160.04 },
                            { text: "the", start: 160.04, end: 160.24 },
                            { text: "deepest", start: 160.24, end: 161 },
                            { text: "of", start: 161.08, end: 161.44 },
                            { text: "your", start: 161.44, end: 161.8 },
                            { text: "soul.", start: 162.04, end: 162.72 }
                        ]
                    }
                ]
            }
        ]
    }
];
