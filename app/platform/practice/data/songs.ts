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
                            { text: "You.", start: 16.0, end: 16.24 }
                        ]
                    },
                    {
                        words: [
                            { text: "I", start: 18.8, end: 19.16 },
                            { text: "wanna", start: 19.16, end: 19.48 },
                            { text: "spend", start: 19.76, end: 20.12 },
                            { text: "a", start: 20.12, end: 20.4 },
                            { text: "day", start: 20.4, end: 20.72 },
                            { text: "with.", start: 20.72, end: 21.08 },
                            { text: "You.", start: 21.08, end: 21.44 }
                        ]
                    },
                    {
                        words: [
                            { text: "And", start: 24.0, end: 24.36 },
                            { text: "I", start: 24.36, end: 24.64 },
                            { text: "don't", start: 24.64, end: 24.96 },
                            { text: "care", start: 24.96, end: 25.24 },
                            { text: "just", start: 25.24, end: 25.56 },
                            { text: "what", start: 25.56, end: 25.88 },
                            { text: "we", start: 25.88, end: 26.24 },
                            { text: "do.", start: 26.24, end: 26.64 }
                        ]
                    },
                    {
                        words: [
                            { text: "It's", start: 28.4, end: 28.88 },
                            { text: "true.", start: 28.88, end: 29.28 }
                        ]
                    },
                    {
                        words: [
                            { text: "Tonight", start: 33.76, end: 34.48 },
                            { text: "we", start: 36.8, end: 37.16 },
                            { text: "stay", start: 37.16, end: 37.52 },
                            { text: "at", start: 37.52, end: 37.84 },
                            { text: "home,", start: 37.84, end: 38.12 },
                            { text: "turn", start: 38.12, end: 38.48 },
                            { text: "down", start: 38.48, end: 38.84 },
                            { text: "the", start: 38.84, end: 39.16 },
                            { text: "lights.", start: 39.16, end: 39.52 }
                        ]
                    },
                    {
                        words: [
                            { text: "And", start: 42.14, end: 42.38 },
                            { text: "maybe", start: 42.38, end: 42.94 },
                            { text: "hold", start: 43.02, end: 43.42 },
                            { text: "each", start: 43.42, end: 43.78 },
                            { text: "other", start: 43.78, end: 44.14 },
                            { text: "tight", start: 44.3, end: 44.86 },
                            { text: "all", start: 46.54, end: 46.94 },
                            { text: "night.", start: 46.94, end: 47.34 }
                        ]
                    }
                ]
            },
            {
                title: "Chorus",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 51.34, end: 51.62 },
                            { text: "you", start: 51.62, end: 51.86 },
                            { text: "love?", start: 51.86, end: 52.22 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 55.5, end: 55.82 },
                            { text: "you", start: 55.82, end: 56.06 },
                            { text: "feel", start: 56.06, end: 56.38 },
                            { text: "it", start: 56.38, end: 56.78 },
                            { text: "from", start: 56.78, end: 57.1 },
                            { text: "above?", start: 57.1, end: 57.58 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 60.7, end: 61.02 },
                            { text: "it", start: 61.02, end: 61.26 },
                            { text: "coming", start: 61.26, end: 61.58 },
                            { text: "from", start: 62.06, end: 62.46 },
                            { text: "below?", start: 62.46, end: 62.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 65.82, end: 66.14 },
                            { text: "the", start: 66.14, end: 66.38 },
                            { text: "deepest", start: 66.38, end: 67.1 },
                            { text: "of", start: 67.26, end: 67.62 },
                            { text: "your", start: 67.62, end: 67.98 },
                            { text: "soul?", start: 68.06, end: 68.62 }
                        ]
                    }
                ]
            },
            {
                title: "Verse 2",
                lines: [
                    {
                        words: [
                            { text: "Stay", start: 75.32, end: 75.56 },
                            { text: "and", start: 78.2, end: 78.56 },
                            { text: "try", start: 78.56, end: 78.88 },
                            { text: "to", start: 78.88, end: 79.2 },
                            { text: "find", start: 79.2, end: 79.56 },
                            { text: "another", start: 79.64, end: 80.04 },
                            { text: "way.", start: 80.52, end: 80.92 }
                        ]
                    },
                    {
                        words: [
                            { text: "Just", start: 83.48, end: 83.88 },
                            { text: "don't", start: 83.96, end: 84.36 },
                            { text: "swive", start: 84.36, end: 84.76 },
                            { text: "and", start: 84.76, end: 85.04 },
                            { text: "like", start: 85.04, end: 85.4 },
                            { text: "and", start: 85.4, end: 85.72 },
                            { text: "play", start: 85.72, end: 86.04 },
                            { text: "all", start: 87.96, end: 88.32 },
                            { text: "day.", start: 88.32, end: 88.68 }
                        ]
                    },
                    {
                        words: [
                            { text: "You", start: 93.0, end: 93.4 },
                            { text: "know,", start: 93.4, end: 93.8 },
                            { text: "don't", start: 96.36, end: 96.76 },
                            { text: "let", start: 96.76, end: 97.0 },
                            { text: "them", start: 97.0, end: 97.32 },
                            { text: "say", start: 97.32, end: 97.68 },
                            { text: "I", start: 97.68, end: 98.0 },
                            { text: "told", start: 98.0, end: 98.32 },
                            { text: "you", start: 98.32, end: 98.68 },
                            { text: "so.", start: 98.68, end: 99.08 }
                        ]
                    },
                    {
                        words: [
                            { text: "Just", start: 101.48, end: 101.88 },
                            { text: "let", start: 101.86, end: 102.24 },
                            { text: "it", start: 102.24, end: 102.56 },
                            { text: "out", start: 102.56, end: 102.88 },
                            { text: "and", start: 102.88, end: 103.2 },
                            { text: "let", start: 103.2, end: 103.52 },
                            { text: "it", start: 103.52, end: 103.8 },
                            { text: "flow.", start: 103.8, end: 104.2 }
                        ]
                    },
                    {
                        words: [
                            { text: "Let's", start: 106.2, end: 106.48 },
                            { text: "go.", start: 106.48, end: 106.76 }
                        ]
                    }
                ]
            },
            {
                title: "Chorus",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 110.84, end: 111.12 },
                            { text: "you", start: 111.12, end: 111.32 },
                            { text: "love?", start: 111.32, end: 111.64 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 115.0, end: 115.28 },
                            { text: "you", start: 115.28, end: 115.52 },
                            { text: "feel", start: 115.52, end: 115.88 },
                            { text: "it", start: 115.88, end: 116.28 },
                            { text: "from", start: 116.28, end: 116.6 },
                            { text: "above?", start: 116.6, end: 117.16 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 120.2, end: 120.52 },
                            { text: "it", start: 120.52, end: 120.76 },
                            { text: "coming", start: 120.76, end: 121.08 },
                            { text: "from", start: 121.56, end: 121.96 },
                            { text: "below?", start: 121.96, end: 122.36 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 125.32, end: 125.64 },
                            { text: "the", start: 125.64, end: 125.88 },
                            { text: "deepest", start: 125.88, end: 126.6 },
                            { text: "of", start: 126.76, end: 127.12 },
                            { text: "your", start: 127.12, end: 127.48 },
                            { text: "soul?", start: 127.48, end: 128.04 }
                        ]
                    }
                ]
            },
            {
                title: "Outro",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 132.58, end: 132.74 },
                            { text: "you", start: 132.74, end: 132.94 },
                            { text: "love,", start: 132.94, end: 133.18 },
                            { text: "do", start: 133.18, end: 133.42 },
                            { text: "you", start: 133.42, end: 133.58 },
                            { text: "love?", start: 133.58, end: 133.82 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 133.82, end: 134.06 },
                            { text: "you", start: 134.06, end: 134.22 },
                            { text: "love?", start: 134.22, end: 134.46 },
                            { text: "Do", start: 134.46, end: 134.7 },
                            { text: "you", start: 134.7, end: 134.9 },
                            { text: "love?", start: 134.9, end: 135.22 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 141.86, end: 142.18 },
                            { text: "you", start: 142.18, end: 142.5 },
                            { text: "love?", start: 142.5, end: 142.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 146.02, end: 146.34 },
                            { text: "you", start: 146.34, end: 146.54 },
                            { text: "feel", start: 146.54, end: 146.82 },
                            { text: "it", start: 146.9, end: 147.3 },
                            { text: "from", start: 147.3, end: 147.62 },
                            { text: "above?", start: 147.62, end: 148.02 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 161.54, end: 161.86 },
                            { text: "it", start: 161.86, end: 162.1 },
                            { text: "coming", start: 162.1, end: 162.42 },
                            { text: "from", start: 162.9, end: 163.3 },
                            { text: "below?", start: 163.46, end: 163.86 }
                        ]
                    },
                    {
                        words: [
                            { text: "From", start: 166.72, end: 167.04 },
                            { text: "the", start: 167.04, end: 167.24 },
                            { text: "deepest", start: 167.24, end: 168.0 },
                            { text: "of", start: 168.08, end: 168.44 },
                            { text: "your", start: 168.44, end: 168.8 },
                            { text: "soul.", start: 169.04, end: 169.72 }
                        ]
                    }
                ]
            }
        ]
    }
];
