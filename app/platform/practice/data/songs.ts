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
                            { text: "Stay", start: 16.0, end: 16.5 },
                            { text: "and", start: 16.5, end: 16.8 },
                            { text: "try", start: 16.8, end: 17.1 },
                            { text: "to", start: 17.1, end: 17.3 },
                            { text: "find", start: 17.3, end: 17.7 },
                            { text: "another", start: 17.7, end: 18.2 },
                            { text: "way", start: 18.2, end: 18.8 }
                        ]
                    },
                    {
                        words: [
                            { text: "Just", start: 19.5, end: 19.8 },
                            { text: "don't", start: 19.8, end: 20.2 },
                            { text: "swipe", start: 20.2, end: 20.6 },
                            { text: "and", start: 20.6, end: 20.8 },
                            { text: "like", start: 20.8, end: 21.2 },
                            { text: "and", start: 21.2, end: 21.4 },
                            { text: "play", start: 21.4, end: 21.8 },
                            { text: "all", start: 21.8, end: 22.1 },
                            { text: "day", start: 22.1, end: 22.6 }
                        ]
                    },
                    {
                        words: [
                            { text: "You", start: 23.5, end: 23.8 },
                            { text: "know", start: 23.8, end: 24.1 },
                            { text: "don't", start: 24.1, end: 24.5 },
                            { text: "let", start: 24.5, end: 24.7 },
                            { text: "them", start: 24.7, end: 25.0 },
                            { text: "say", start: 25.0, end: 25.3 },
                            { text: "I", start: 25.3, end: 25.5 },
                            { text: "told", start: 25.5, end: 25.8 },
                            { text: "you", start: 25.8, end: 26.3 }
                        ]
                    },
                    {
                        words: [
                            { text: "So", start: 27.5, end: 27.8 },
                            { text: "just", start: 27.8, end: 28.1 },
                            { text: "let", start: 28.1, end: 28.4 },
                            { text: "it", start: 28.4, end: 28.6 },
                            { text: "out", start: 28.6, end: 29.0 },
                            { text: "and", start: 29.0, end: 29.2 },
                            { text: "let", start: 29.2, end: 29.5 },
                            { text: "it", start: 29.5, end: 29.7 },
                            { text: "flow", start: 29.7, end: 30.3 }
                        ]
                    }
                ]
            },
            {
                title: "Chorus",
                lines: [
                    {
                        words: [
                            { text: "Do", start: 32.0, end: 32.3 },
                            { text: "you", start: 32.3, end: 32.6 },
                            { text: "love?", start: 32.6, end: 33.2 }
                        ]
                    },
                    {
                        words: [
                            { text: "Do", start: 34.0, end: 34.3 },
                            { text: "you", start: 34.3, end: 34.6 },
                            { text: "feel", start: 34.6, end: 34.9 },
                            { text: "it", start: 34.9, end: 35.1 },
                            { text: "from", start: 35.1, end: 35.4 },
                            { text: "above?", start: 35.4, end: 36.1 }
                        ]
                    },
                    {
                        words: [
                            { text: "Is", start: 36.5, end: 36.8 },
                            { text: "it", start: 36.8, end: 37.0 },
                            { text: "coming", start: 37.0, end: 37.4 },
                            { text: "from", start: 37.4, end: 37.7 },
                            { text: "below?", start: 37.7, end: 38.3 }
                        ]
                    },
                    {
                        words: [
                            { text: "The", start: 38.5, end: 38.8 },
                            { text: "deepest", start: 38.8, end: 39.3 },
                            { text: "of", start: 39.3, end: 39.5 },
                            { text: "your", start: 39.5, end: 39.8 },
                            { text: "soul", start: 39.8, end: 40.5 }
                        ]
                    },
                    {
                        words: [
                            { text: "Peace", start: 41.0, end: 41.5 },
                            { text: "and", start: 41.5, end: 41.8 },
                            { text: "love", start: 41.8, end: 42.3 },
                            { text: "from", start: 42.3, end: 42.6 },
                            { text: "the", start: 42.6, end: 42.8 },
                            { text: "deepest", start: 42.8, end: 43.3 },
                            { text: "of", start: 43.3, end: 43.5 },
                            { text: "your", start: 43.5, end: 43.8 },
                            { text: "soul", start: 43.8, end: 44.5 }
                        ]
                    }
                ]
            }
        ]
    }
];
