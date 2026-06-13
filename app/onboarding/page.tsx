"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Music, Check, Star, Sparkles, Wand2, ShieldCheck, CreditCard, Mail, Lock, User, ArrowRight, ArrowLeft, Inbox, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

const STEPS = {
    QUIZ: 'quiz',
    HYPE: 'hype',
    AUTH: 'auth',
    PAYWALL: 'paywall'
};

const QUESTIONS = [
    {
        id: 'songwriter_type',
        question: "What describes you best?",
        options: [
            { label: "The Lyricist: Words come first.", value: "lyricist" },
            { label: "The Melodist: I hear melodies before lyrics.", value: "melodist" },
            { label: "The Producer: I build songs through sound and rhythm.", value: "producer" },
            { label: "The Storyteller: I want to express emotions and experiences.", value: "storyteller" },
            { label: "The Explorer: I’m still discovering my style.", value: "explorer" }
        ]
    },
    {
        id: 'struggle',
        question: "What is your biggest struggle?",
        options: [
            { label: "I start songs but never finish them.", value: "unfinished" },
            { label: "I can write lyrics, but melodies feel weak.", value: "weak_melodies" },
            { label: "I have ideas, but no structure.", value: "no_structure" },
            { label: "Everything sounds too similar.", value: "too_similar" },
            { label: "I overthink and lose inspiration.", value: "overthink" }
        ]
    },
    {
        id: 'dream_outcome',
        question: "What do you want most from songwriting?",
        options: [
            { label: "Finish songs I’m proud of.", value: "finish_songs" },
            { label: "Develop my own unique sound.", value: "unique_sound" },
            { label: "Write songs that move people emotionally.", value: "move_people" },
            { label: "Release music professionally.", value: "release_music" },
            { label: "Become more creative and fearless.", value: "creative_fearless" }
        ]
    },
    {
        id: 'emotional_inspiration',
        question: "Which feeling pulls you the most?",
        isVisual: true,
        options: [
            { label: "Melancholic & emotional", value: "melancholic", color: "blue" },
            { label: "Energetic & uplifting", value: "energetic", color: "gold" },
            { label: "Cinematic & dreamy", value: "cinematic", color: "purple" },
            { label: "Dark & raw", value: "dark", color: "red" },
            { label: "Intimate & acoustic", value: "intimate", color: "gold" }
        ]
    },
    {
        id: 'creation_method',
        question: "How do songs usually begin for you?",
        options: [
            { label: "A lyric or phrase", value: "lyric_phrase" },
            { label: "A melody in my head", value: "melody_head" },
            { label: "Chords on guitar or piano", value: "chords" },
            { label: "A beat or production idea", value: "beat_production" },
            { label: "Pure improvisation", value: "improvisation" }
        ]
    }
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(STEPS.QUIZ);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Firebase Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [emailShowError, setEmailShowError] = useState(false);

    const router = useRouter();

    const handleAuthError = (err: any) => {
        console.error('Google Sign-Up error details:', err);
        if (err.code === 'auth/operation-not-allowed') {
            setError('Google Sign-In is not enabled. Please enable Google as a sign-in provider in your Firebase Console under Authentication > Sign-in method.');
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the Authorized Domains list in your Firebase Console.`);
        } else if (err.code === 'auth/popup-blocked') {
            setError('Sign-up popup was blocked by your browser. Please allow popups for this site, or try again.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError('Sign-up popup was closed before completing. Please try again.');
        } else {
            setError(err.message || 'Failed to sign up with Google.');
        }
    };

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    setIsLoading(true);
                    const user = result.user;
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (!userDoc.exists()) {
                        await setDoc(doc(db, "users", user.uid), {
                            uid: user.uid,
                            name: user.displayName || 'Guest User',
                            email: user.email || '',
                            answers: answers,
                            createdAt: new Date().toISOString(),
                            tier: 'trial',
                            lastActiveAt: new Date().toISOString()
                        });
                    }
                    setCurrentStep(STEPS.PAYWALL);
                }
            } catch (err: any) {
                console.error('Redirect sign-up error:', err);
                handleAuthError(err);
            } finally {
                setIsLoading(false);
            }
        };
        checkRedirectResult();
    }, [router, answers]);

    const handleGoogleSignUp = async () => {
        setError('');
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: user.displayName || 'Guest User',
                    email: user.email || '',
                    answers: answers,
                    createdAt: new Date().toISOString(),
                    tier: 'trial',
                    lastActiveAt: new Date().toISOString()
                });
            }
            setCurrentStep(STEPS.PAYWALL);
        } catch (err: any) {
            console.error('Google Sign-Up error:', err);
            if (
                err.code === 'auth/popup-blocked' ||
                err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request'
            ) {
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirectErr: any) {
                    handleAuthError(redirectErr);
                }
            } else {
                handleAuthError(err);
            }
        } finally {
            setIsLoading(false);
        }
    };
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const handleBack = () => {
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
        setIsTransitioning(false);
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    useEffect(() => {
        const questionId = QUESTIONS[currentQuestionIndex]?.id;
        if (questionId) {
            setSelectedOption(answers[questionId] || null);
        }
    }, [currentQuestionIndex, answers]);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, []);

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    const handleAnswer = (value: string, color?: string) => {
        if (isTransitioning) return;

        if (value === selectedOption) {
            // Deselect option
            setAnswers(prev => {
                const newAnswers = { ...prev };
                delete newAnswers[currentQuestion.id];
                return newAnswers;
            });
            setSelectedOption(null);
            return;
        }

        setSelectedOption(value);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
        setIsTransitioning(true);

        const timeoutId = setTimeout(() => {
            if (color) {
                setSelectedColor(color);
            }

            if (currentQuestionIndex < QUESTIONS.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                if (color) {
                    setTimeout(() => {
                        setCurrentStep(STEPS.HYPE);
                    }, 1000);
                } else {
                    setCurrentStep(STEPS.HYPE);
                }
            }
            setIsTransitioning(false);
        }, 400);

        transitionTimeoutRef.current = timeoutId;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        
        setIsLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            // Get or create display name
            const emailPrefix = email.split('@')[0];
            const defaultName = emailPrefix
                .split(/[._-]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            await updateProfile(user, { displayName: defaultName });

            // Create Firestore user document
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: defaultName,
                email: email,
                answers: answers,
                createdAt: new Date().toISOString(),
                tier: 'trial',
                lastActiveAt: new Date().toISOString()
            });

            // Progress to paywall
            setCurrentStep(STEPS.PAYWALL);
        } catch (err: any) {
            console.error('Sign-up error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use. Please sign in instead.');
            } else {
                setError(err.message || 'Failed to create account. Please check your network or try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start md:justify-center px-6 pt-28 pb-12 md:py-32 bg-[#DCDDD4] relative overflow-hidden font-sans">
            {/* Header / Logo */}
            <div className="absolute top-8 left-0 right-0 flex justify-center md:top-12 z-50">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <svg width="151" height="39" viewBox="0 0 151 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[120px] md:w-[151px] h-auto">
                        <path d="M26.8756 9.80365C27.7045 8.52842 28.0552 7.52417 27.9276 6.79091C27.832 6.05765 27.4016 5.51568 26.6365 5.16499C25.8713 4.8143 24.8671 4.59113 23.6237 4.49549L23.8628 3.53906C24.1816 3.57094 24.7555 3.60282 25.5844 3.6347C26.4452 3.6347 27.3538 3.65064 28.3102 3.68252C29.2985 3.68252 30.0796 3.68252 30.6535 3.68252C31.323 3.68252 31.9606 3.66658 32.5663 3.6347C33.172 3.60282 33.73 3.57094 34.2401 3.53906L34.0009 4.49549C33.2358 4.71865 32.5344 5.02152 31.8968 5.40409C31.2911 5.75478 30.6535 6.3127 29.984 7.07784C29.3145 7.8111 28.5493 8.84723 27.6885 10.1862L9.85119 37.6357C9.24545 37.5719 8.63972 37.54 8.03398 37.54C7.46012 37.54 6.87033 37.5719 6.26459 37.6357L2.48671 7.55605C2.35918 6.40834 2.02444 5.62726 1.48246 5.21281C0.940486 4.76647 0.446332 4.52737 0 4.49549L0.239107 3.53906C1.16365 3.57094 2.35918 3.60282 3.8257 3.6347C5.32411 3.66658 6.80657 3.68252 8.27309 3.68252C9.99465 3.68252 11.5728 3.66658 13.0074 3.6347C14.4739 3.60282 15.6694 3.57094 16.594 3.53906L16.3549 4.49549C15.3347 4.52737 14.5217 4.65489 13.916 4.87806C13.3103 5.10122 12.8958 5.48379 12.6726 6.02577C12.4814 6.56774 12.4335 7.39665 12.5292 8.51248L14.8246 29.6017L12.6726 31.6102L26.8756 9.80365Z" fill="#363636"/>
                        <path d="M134.341 27.212C135.521 26.7019 136.653 26.1281 137.737 25.4905C138.821 24.821 139.777 24.1036 140.606 23.3385C141.849 22.1589 142.869 20.804 143.666 19.2737C144.463 17.7115 144.862 16.0378 144.862 14.2525C144.862 13.7105 144.798 13.3438 144.671 13.1526C144.543 12.9613 144.352 12.8656 144.097 12.8656C143.427 12.8656 142.694 13.2323 141.897 13.9655C141.1 14.6669 140.319 15.6233 139.554 16.8348C138.789 18.0144 138.087 19.3693 137.45 20.8996C136.844 22.398 136.35 23.9602 135.967 25.5861C135.585 27.1801 135.393 28.7423 135.393 30.2726C135.393 32.0898 135.744 33.3172 136.445 33.9548C137.179 34.5925 138.119 34.9113 139.267 34.9113C140 34.9113 141.004 34.6562 142.28 34.1461C143.555 33.6041 144.814 32.6477 146.058 31.2768L146.823 31.6594C146.153 32.7115 145.26 33.7317 144.145 34.72C143.029 35.7083 141.722 36.5212 140.223 37.1589C138.725 37.7646 137.067 38.0675 135.25 38.0675C133.783 38.0675 132.444 37.8124 131.233 37.3023C130.053 36.7922 129.113 36.043 128.411 35.0547C127.71 34.0345 127.359 32.7912 127.359 31.3247C127.359 29.5393 127.646 27.7381 128.22 25.9209C128.794 24.1036 129.607 22.3661 130.659 20.7083C131.711 19.0186 132.97 17.5202 134.437 16.2131C135.935 14.906 137.577 13.8699 139.363 13.1047C141.148 12.3396 143.077 11.957 145.149 11.957C146.679 11.957 147.97 12.2918 149.022 12.9613C150.074 13.5989 150.601 14.6031 150.601 15.974C150.601 17.1855 150.266 18.3332 149.596 19.4172C148.927 20.4692 148.018 21.4416 146.87 22.3343C145.755 23.2269 144.479 24.0239 143.045 24.7253C141.642 25.4267 140.191 26.0324 138.693 26.5425C137.195 27.0526 135.728 27.4511 134.293 27.7381L134.341 27.212Z" fill="#363636"/>
                        <path d="M131.023 12.626L130.879 13.5824H113.711L113.951 12.626H131.023ZM119.928 33.3326C119.705 34.0658 119.705 34.6238 119.928 35.0063C120.151 35.357 120.502 35.5324 120.98 35.5324C121.618 35.5324 122.255 35.1976 122.893 34.5281C123.563 33.8267 124.121 32.8703 124.567 31.6588L125.332 29.6503H126.241L125.332 32.3762C124.694 34.2252 123.738 35.6439 122.463 36.6323C121.219 37.5887 119.705 38.0669 117.92 38.0669C116.389 38.0669 115.21 37.7162 114.381 37.0148C113.552 36.2816 113.058 35.3251 112.898 34.1455C112.739 32.9341 112.867 31.5951 113.281 30.1286L120.359 5.5484C121.921 5.51652 123.323 5.45276 124.567 5.35712C125.81 5.26147 127.022 5.10207 128.201 4.87891L119.928 33.3326Z" fill="#363636"/>
                        <path d="M102.856 12.9135C102.219 12.9135 101.501 13.3598 100.704 14.2525C99.9391 15.1451 99.174 16.3407 98.4088 17.8391C97.6437 19.3375 96.9423 21.0112 96.3047 22.8603C95.6671 24.7094 95.157 26.6063 94.7744 28.551C94.3918 30.4958 94.2005 32.3608 94.2005 34.1461C94.2005 35.2301 94.2962 35.9952 94.4875 36.4415C94.7106 36.8879 95.0454 37.111 95.4917 37.111C96.0974 37.111 96.7829 36.6966 97.548 35.8677C98.3132 35.0069 99.0624 33.8592 99.7956 32.4246C100.561 30.958 101.262 29.3162 101.9 27.499C102.537 25.6499 103.047 23.737 103.43 21.7604C103.845 19.7838 104.052 17.855 104.052 15.974C104.052 14.6988 103.94 13.8699 103.717 13.4873C103.494 13.1047 103.207 12.9135 102.856 12.9135ZM87.0273 30.0813C87.0273 28.5829 87.2346 27.0048 87.649 25.347C88.0635 23.6892 88.6851 22.0792 89.5141 20.517C90.343 18.923 91.395 17.4884 92.6703 16.2131C93.9774 14.906 95.4917 13.8699 97.2133 13.1047C98.9348 12.3396 100.896 11.957 103.095 11.957C105.71 11.957 107.718 12.6425 109.121 14.0133C110.524 15.3842 111.225 17.3608 111.225 19.9432C111.225 21.4416 111.018 23.0197 110.603 24.6775C110.189 26.3353 109.567 27.9612 108.738 29.5553C107.909 31.1174 106.841 32.5521 105.534 33.8592C104.259 35.1344 102.761 36.1546 101.039 36.9198C99.3174 37.6849 97.3567 38.0675 95.157 38.0675C92.5427 38.0675 90.5342 37.382 89.1315 36.0111C87.7287 34.6403 87.0273 32.6637 87.0273 30.0813Z" fill="#363636"/>
                        <path d="M66.5958 37.398H58.9922L64.8264 16.6913C64.9858 16.2131 65.0814 15.8146 65.1133 15.4958C65.1452 15.177 65.0974 14.9379 64.9699 14.7785C64.8742 14.5872 64.667 14.4916 64.3482 14.4916C63.8062 14.4916 63.312 14.7307 62.8657 15.2089C62.4513 15.6871 61.989 16.5798 61.4789 17.8869L60.4746 20.5649H59.566L60.905 16.8826C61.5108 15.1292 62.3397 13.8699 63.3917 13.1047C64.4438 12.3396 65.735 11.957 67.2653 11.957C68.4449 11.957 69.3694 12.1643 70.0389 12.5787C70.7403 12.9613 71.2185 13.4873 71.4735 14.1568C71.7286 14.8263 71.8402 15.5596 71.8083 16.3566C71.7764 17.1217 71.6648 17.8869 71.4735 18.652L66.5958 37.398ZM67.9348 29.9378C69.21 26.2397 70.3896 23.2269 71.4735 20.8996C72.5575 18.5723 73.6096 16.7551 74.6298 15.448C75.6818 14.109 76.7498 13.2004 77.8338 12.7222C78.9496 12.2121 80.1292 11.957 81.3726 11.957C82.9347 11.957 84.0665 12.2918 84.7679 12.9613C85.4693 13.5989 85.8359 14.4756 85.8678 15.5914C85.8996 16.6754 85.6924 17.8709 85.2461 19.178L80.5118 33.3332C80.2248 34.2258 80.177 34.8156 80.3683 35.1025C80.5596 35.3895 80.8146 35.5329 81.1335 35.5329C81.4841 35.5329 81.8986 35.3417 82.3768 34.9591C82.855 34.5446 83.3651 33.6041 83.9071 32.1376L84.8157 29.6509H85.7243L84.5288 33.1419C84.0824 34.4809 83.4926 35.5011 82.7594 36.2024C82.058 36.9038 81.2769 37.382 80.4161 37.6371C79.5872 37.924 78.7583 38.0675 77.9294 38.0675C76.973 38.0675 76.1441 37.924 75.4427 37.6371C74.7732 37.3501 74.2472 36.9357 73.8646 36.3937C73.4183 35.7561 73.1792 34.9431 73.1473 33.9548C73.1473 32.9665 73.4023 31.6913 73.9124 30.1291L78.1207 17.5043C78.312 16.9623 78.4395 16.4841 78.5033 16.0697C78.567 15.6233 78.5511 15.2726 78.4555 15.0176C78.3598 14.7625 78.1526 14.635 77.8338 14.635C77.2599 14.635 76.6064 15.0495 75.8731 15.8784C75.1399 16.7073 74.3747 17.8391 73.5777 19.2737C72.7807 20.7083 71.9677 22.3661 71.1388 24.2471C70.3099 26.1281 69.5129 28.1366 68.7477 30.2726C68.0145 32.3767 67.3769 34.4968 66.8349 36.6328L67.9348 29.9378Z" fill="#363636"/>
                        <path d="M51.7705 5.06906C51.7705 3.34749 52.3284 2.07226 53.4442 1.24335C54.56 0.414451 55.9469 0 57.6047 0C59.0074 0 60.0595 0.270987 60.7609 0.812963C61.4941 1.35494 61.8608 2.1679 61.8608 3.25185C61.8608 4.75025 61.2869 5.96172 60.1392 6.88627C59.0234 7.77893 57.6366 8.22527 55.9787 8.22527C54.6079 8.22527 53.5558 7.95428 52.8225 7.4123C52.1212 6.87033 51.7705 6.08925 51.7705 5.06906ZM49.762 16.6418C50.2083 15.3028 50.0648 14.6333 49.3316 14.6333C48.8534 14.6333 48.407 14.8565 47.9926 15.3028C47.5781 15.7173 47.1477 16.4984 46.7014 17.6461L45.6015 20.5632H44.6929L46.0319 16.8331C46.4782 15.6216 47.0362 14.6652 47.7057 13.9638C48.407 13.2306 49.22 12.7045 50.1445 12.3857C51.0691 12.0669 52.0733 11.9075 53.1573 11.9075C54.3688 11.9075 55.3411 12.1147 56.0744 12.5292C56.8076 12.9436 57.3337 13.4856 57.6525 14.1551C57.9713 14.7927 58.1307 15.51 58.1307 16.3071C58.1307 17.0722 58.0032 17.8373 57.7481 18.6025L52.7747 33.3315C52.5197 34.1285 52.4719 34.6704 52.6313 34.9574C52.7907 35.2124 53.0298 35.3399 53.3486 35.3399C53.6355 35.3399 54.0021 35.1805 54.4485 34.8617C54.8948 34.511 55.373 33.6662 55.8831 32.3272L56.8874 29.6492H57.796L56.6004 33.1402C56.1222 34.4792 55.5165 35.4994 54.7832 36.2007C54.05 36.9021 53.237 37.3803 52.3443 37.6354C51.4835 37.9223 50.6228 38.0658 49.762 38.0658C48.3592 38.0658 47.2115 37.7788 46.3188 37.205C45.4581 36.5992 44.932 35.6906 44.7407 34.4792C44.5495 33.2358 44.7567 31.6896 45.3624 29.8405L49.762 16.6418Z" fill="#363636"/>
                        <path d="M28.91 27.3525C29.9302 26.8743 30.9345 26.3005 31.9228 25.631C32.9111 24.9615 33.8197 24.2282 34.6486 23.4312C35.9238 22.1878 36.96 20.7691 37.757 19.1751C38.5859 17.581 39.0003 15.8595 39.0003 14.0104C39.0003 13.5641 38.9366 13.2612 38.8091 13.1018C38.6815 12.9105 38.4902 12.8149 38.2352 12.8149C37.5976 12.8149 36.8962 13.1815 36.1311 13.9147C35.3978 14.6161 34.6645 15.5726 33.9313 16.784C33.198 17.9636 32.5285 19.3026 31.9228 20.801C31.3489 22.2994 30.8707 23.8456 30.4881 25.4397C30.1375 27.0018 29.9621 28.5162 29.9621 29.9827C29.9621 31.8318 30.3287 33.0752 31.062 33.7128C31.7953 34.3185 32.7517 34.6214 33.9313 34.6214C34.5689 34.6214 35.5253 34.3823 36.8006 33.9041C38.0758 33.4258 39.351 32.5491 40.6263 31.2739L41.3914 31.6565C40.69 32.7085 39.7655 33.7287 38.6178 34.717C37.4701 35.7053 36.1151 36.5183 34.553 37.1559C32.9908 37.7616 31.2374 38.0645 29.2926 38.0645C27.7942 38.0645 26.4074 37.8095 25.1322 37.2994C23.8888 36.7893 22.8846 36.0401 22.1194 35.0518C21.3862 34.0316 21.0195 32.7882 21.0195 31.3217C21.0195 29.4407 21.3065 27.5757 21.8803 25.7266C22.4861 23.8775 23.3309 22.1241 24.4148 20.4663C25.4988 18.8085 26.79 17.3419 28.2884 16.0667C29.8187 14.7596 31.5083 13.7394 33.3574 13.0061C35.2065 12.2729 37.1831 11.9062 39.2873 11.9062C40.977 11.9062 42.3797 12.2569 43.4955 12.9583C44.6433 13.6278 45.2171 14.6799 45.2171 16.1145C45.2171 17.326 44.8983 18.4737 44.2607 19.5577C43.6231 20.6097 42.7463 21.5821 41.6305 22.4748C40.5147 23.3355 39.2554 24.1166 37.8526 24.818C36.4499 25.5194 34.9674 26.1251 33.4052 26.6352C31.875 27.1453 30.3606 27.5438 28.8622 27.8307L28.91 27.3525Z" fill="#363636"/>
                    </svg>
                </Link>
            </div>

            <main className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">
                    {currentStep === STEPS.QUIZ && (
                        <motion.div
                            key={`q-${currentQuestionIndex}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-12"
                        >
                            <div className="space-y-8">
                                <div className="flex items-center justify-between w-4/5 mx-auto gap-4">
                                    {currentQuestionIndex > 0 ? (
                                        <button
                                            onClick={handleBack}
                                            className="text-stone-600 hover:text-stone-900 bg-white/40 hover:bg-white border border-stone-300 hover:border-stone-400 transition-all p-2 rounded-full flex items-center justify-center shadow-sm shrink-0"
                                            title="Go back"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                    ) : (
                                        <div className="w-[34px]" />
                                    )}
                                    <div className="flex-grow h-2 bg-[#BBBEB2]/20 rounded-full overflow-hidden relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="h-full bg-stone-900 rounded-full"
                                        />
                                    </div>
                                    <div className="w-[34px]" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-4xl md:text-[3.25rem] font-sans font-light tracking-tight text-[#363636] leading-[1.1]">
                                        {currentQuestion.question}
                                    </h2>
                                </div>
                            </div>

                            <div className="grid gap-3 md:gap-5">
                                {currentQuestion.options.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => handleAnswer(option.value, (option as any).color)}
                                        disabled={isTransitioning}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`group relative w-full px-5 md:px-8 py-5 md:py-6 text-left border transition-all duration-300 rounded-2xl overflow-hidden ${selectedOption === option.value
                                            ? 'border-[#363636] bg-white text-stone-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)]'
                                            : 'border-stone-200/80 bg-[#EFF0E7]/40 text-[#363636]/80 hover:border-[#363636]/40 hover:bg-[#EFF0E7]/80'
                                            }`}
                                    >
                                        <div className="relative flex items-center justify-between">
                                            <span className={`text-[18px] md:text-[21px] font-sans font-medium transition-colors duration-300 ${
                                                selectedOption === option.value ? 'text-stone-950' : 'text-stone-800 group-hover:text-stone-950'
                                            }`}>
                                                {option.label}
                                            </span>
                                            <ChevronRight className={`transition-all duration-500 shrink-0 ${selectedOption === option.value ? 'text-stone-950 translate-x-0 opacity-100' : 'text-stone-600 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} size={18} />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {currentStep === STEPS.HYPE && (
                        <HypeSection onComplete={() => setCurrentStep(STEPS.AUTH)} />
                    )}

                    {currentStep === STEPS.AUTH && (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-4xl md:text-[3.25rem] font-sans font-light tracking-tight text-stone-900 leading-[1.1]">Secure your path</h2>
                                <p className="text-stone-700/80 text-[15px] font-medium">Create your credentials to continue your songwriting journey.</p>
                            </div>

                            <form onSubmit={handleSignUp} className="bg-[#EFF0E7] p-8 md:p-10 border border-stone-200/60 rounded-[28px] space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <div className="space-y-4 text-left">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email Address"
                                        className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-xl font-medium placeholder:text-stone-500"
                                        disabled={isLoading}
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-white border border-stone-200 rounded-[20px] py-5 px-8 text-stone-900 font-sans outline-none focus:border-[#BBBEB2] transition-all text-xl font-medium placeholder:text-stone-500"
                                        disabled={isLoading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-[#86BE7F] hover:opacity-95 text-stone-900 text-xl font-semibold rounded-[20px] transition-all mt-6 flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)] disabled:opacity-75 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Creating account...' : 'Continue'}
                                    <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                                </button>

                                <div className="mt-6 flex items-center gap-4">
                                    <div className="h-px bg-stone-300/40 flex-grow" />
                                    <span className="text-xs text-stone-500 font-medium">or</span>
                                    <div className="h-px bg-stone-300/40 flex-grow" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleSignUp}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 py-5 border border-stone-200 rounded-[20px] text-xl font-semibold text-stone-900 bg-white hover:bg-stone-50 shadow-sm transition-all disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Create with Google
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {currentStep === STEPS.PAYWALL && (
                        <PaywallSection />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function HypeSection({ onComplete }: { onComplete: () => void }) {
    const [animationStep, setAnimationStep] = useState(0);
    const messages = [
        "Analyzing answers...",
        "Removing boring theory...",
        "Prioritizing Visual Learning..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationStep(prev => prev + 1);
        }, 1500);

        if (animationStep >= messages.length + 1) {
            clearInterval(interval);
            setTimeout(onComplete, 2000);
        }

        return () => clearInterval(interval);
    }, [animationStep, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-12"
        >
            <div className="relative h-48 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {animationStep < messages.length ? (
                        <motion.p
                            key={animationStep}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-2xl text-[#363636] font-sans font-light italic"
                        >
                            {messages[animationStep]}
                        </motion.p>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <h2 className="text-sm font-sans text-stone-500 tracking-[0.3em] uppercase mb-4 block">The Verdict</h2>
                            <h1 className="text-4xl md:text-[3.5rem] font-sans font-light text-stone-900 leading-[1.1]">
                                "You are a <span className="italic">Visual Learner.</span>"
                            </h1>
                            <p className="text-lg text-stone-700/80 font-medium max-w-lg mx-auto font-sans mt-4">
                                You don't need more drills. You need to see the music.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-center gap-2">
                {messages.map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: animationStep === i ? [1, 1.5, 1] : 1,
                            backgroundColor: animationStep >= i ? '#86BE7F' : '#d1d5db',
                            opacity: animationStep >= i ? 1 : 0.2
                        }}
                        className="w-3 h-3 rounded-full"
                    />
                ))}
            </div>
        </motion.div>
    );
}

function PaywallSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-12"
        >
            <div className="space-y-4">
                <h1 className="text-4xl md:text-[3.25rem] font-sans font-light text-stone-900 leading-[1.1]">Start your transformation.</h1>
                <p className="text-stone-700/80 text-[15px] font-medium mt-2">
                    Try the full platform risk-free. Cancel anytime.
                </p>
            </div>

            <div className="max-w-md mx-auto relative group">
                <div className="relative bg-white border border-stone-200 p-10 rounded-[32px] shadow-[0_12px_45px_rgba(0,0,0,0.02)] space-y-8">
                    <div className="space-y-2">
                        <div className="inline-block px-4 py-1.5 bg-[#FFF35F] text-stone-900 text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
                            Most Popular
                        </div>
                        <h3 className="text-3xl font-sans font-light text-stone-900">7-day free trial</h3>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-sans font-bold text-stone-900">$29</span>
                            <span className="text-stone-500 text-sm font-sans uppercase tracking-widest">/month</span>
                        </div>
                    </div>

                    <ul className="space-y-4 text-left">
                        {[
                            { text: "The \"Visual Music\" Engine", icon: <Wand2 size={18} /> },
                            { text: "Step-by-Step Curriculum", icon: <Check size={18} /> },
                            { text: "The \"Money-Back\" Guarantee", icon: <ShieldCheck size={18} /> }
                        ].map((item, i) => (
                            <li key={i} className="flex gap-4 text-[#363636]/80 font-sans font-medium text-[15px] items-center">
                                <span className="text-[#86BE7F]">{item.icon}</span>
                                {item.text}
                            </li>
                        ))}
                    </ul>

                    <div className="space-y-4">
                        <Link
                                    href="/platform/create"
                                    className="w-full py-5 bg-[#86BE7F] hover:opacity-95 text-stone-900 text-xl font-semibold rounded-[20px] transition-all flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                                >
                                    <CreditCard className="w-5 h-5 stroke-[2.5px]" />
                                    Start free trial
                                </Link>
                        <div className="space-y-1">
                            <p className="text-[11px] text-stone-500 uppercase tracking-widest">
                                No charge today.
                            </p>
                            <p className="text-[11px] text-stone-700 uppercase tracking-widest font-semibold">
                                Reminder sent 2 days before trial ends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
