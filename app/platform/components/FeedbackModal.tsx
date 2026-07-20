"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    
    // File upload states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadedName, setUploadedName] = useState<string | null>(null);
    
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    
    const uploadTaskRef = useRef<UploadTask | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset form states on close/open, and cancel any active background uploads
    useEffect(() => {
        if (isOpen) {
            setSubject('');
            setMessage('');
            setSelectedFile(null);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadedUrl(null);
            setUploadedName(null);
            setStatus({ type: '', message: '' });
        } else {
            cancelActiveUpload();
        }
    }, [isOpen]);

    const cancelActiveUpload = () => {
        if (uploadTaskRef.current) {
            try {
                uploadTaskRef.current.cancel();
            } catch (err) {
                console.log("Upload cancel info:", err);
            }
            uploadTaskRef.current = null;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate client-side limit of 3MB
            if (file.size > 3 * 1024 * 1024) {
                setStatus({
                    type: 'error',
                    message: t('feedback_modal.size_limit_error') || 'File size exceeds the 3MB limit. Please select a smaller file.'
                });
                return;
            }

            setStatus({ type: '', message: '' });
            setSelectedFile(file);
            startBackgroundUpload(file);
        }
    };

    const startBackgroundUpload = (file: File) => {
        cancelActiveUpload();
        setIsUploading(true);
        setUploadProgress(0);
        setUploadedUrl(null);
        setUploadedName(null);

        const fileExtension = file.name.split('.').pop();
        const storagePath = `users/${user?.uid || 'anonymous'}/feedback_attachments/${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTaskRef.current = uploadTask;

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                // If it was cancelled by the user, don't show an error
                if (error.code === 'storage/canceled') {
                    console.log("Upload cancelled by user.");
                    return;
                }
                console.error("Upload error:", error);
                setStatus({
                    type: 'error',
                    message: t('feedback_modal.error') || 'Failed to upload attachment. Please check your connection or try again.'
                });
                setSelectedFile(null);
                setIsUploading(false);
                setUploadProgress(0);
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    setUploadedUrl(downloadUrl);
                    setUploadedName(file.name);
                } catch (urlErr) {
                    console.error("Error getting download URL:", urlErr);
                } finally {
                    setIsUploading(false);
                    uploadTaskRef.current = null;
                }
            }
        );
    };

    const handleRemoveFile = () => {
        cancelActiveUpload();
        setSelectedFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedUrl(null);
        setUploadedName(null);
        // Clear size limit or attachment errors if they remove the file
        if (status.type === 'error' && (status.message.includes('3MB') || status.message.includes('attachment'))) {
            setStatus({ type: '', message: '' });
        }
    };

    if (!isOpen || !mounted) return null;

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim() || isUploading) return;

        setIsSending(true);
        setStatus({ type: '', message: '' });

        try {
            // Call API route to email and save the feedback.
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user?.uid || 'anonymous',
                    userName: user?.displayName || 'Anonymous User',
                    userEmail: user?.email || 'no-email@veinote.com',
                    subject: subject.trim(),
                    message: message.trim(),
                    attachmentUrl: uploadedUrl,
                    attachmentName: uploadedName
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to send feedback email');
            }

            // Success!
            setStatus({
                type: 'success',
                message: t('feedback_modal.success') || 'Your feedback has been sent. Thank you!'
            });

        } catch (err: any) {
            console.error('Error submitting feedback:', err);
            setStatus({
                type: 'error',
                message: err.message || t('feedback_modal.error') || 'Failed to send feedback. Please check your connection or try again.'
            });
        } finally {
            setIsSending(false);
        }
    };

    // Render Success Modal view
    if (status.type === 'success') {
        return createPortal(
            <div 
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={onClose}
            >
                <div 
                    className="bg-white rounded-[16px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-lg w-full p-8 sm:p-10 flex flex-col gap-6 items-center text-center animate-in zoom-in-95 duration-200 relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Success icon */}
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L100,192.69,218.34,74.34a8,8,0,0,1,11.32,11.32Z"></path>
                        </svg>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-sans font-light text-stone-700 tracking-tight">
                        {t('feedback_modal.title') || 'Your feedback makes Veinote better for everyone.'}
                    </h3>
                    
                    <p className="text-[15px] font-sans font-medium text-stone-500 max-w-sm">
                        {status.message}
                    </p>

                    <button 
                        type="button"
                        onClick={onClose}
                        className="mt-4 px-10 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-[15px] font-sans font-medium transition-colors cursor-pointer"
                    >
                        {t('common.close') || 'Close'}
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div 
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <form 
                onSubmit={handleSubmitFeedback}
                className="bg-white rounded-[16px] border border-stone-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-lg w-full p-8 sm:p-10 flex flex-col gap-8 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-3xl md:text-[38px] leading-[1.25] font-sans font-light text-stone-600 tracking-[-0.035em]">
                    {t('feedback_modal.title') || 'Share Your Feedback'}
                </h3>

                <div className="flex flex-col gap-6">
                    {/* User display info */}
                    {user?.email && (
                        <div className="text-stone-400 text-xs font-sans font-medium -mb-2 px-1">
                            {t('collab.invited_you') ? `Sending as: ` : `Från: `}
                            <span className="text-stone-700 font-semibold">{user.email}</span>
                        </div>
                    )}

                    {/* Subject Input */}
                    <input 
                        type="text" 
                        required
                        placeholder={t('feedback_modal.subject_placeholder') || 'Subject / What is this about?'}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-full px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-300"
                        disabled={isSending}
                    />

                    {/* Message Textarea */}
                    <textarea
                        required
                        placeholder={t('feedback_modal.message_placeholder') || 'Write your feedback or ideas here...'}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-[20px] px-6 py-4 text-[17px] font-sans font-medium outline-none focus:bg-white focus:border-stone-400 transition-all placeholder:text-stone-300 min-h-[160px] resize-none"
                        disabled={isSending}
                    />

                    {/* File Attachment Upload */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between px-1">
                            <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold">
                                {t('feedback_modal.attachment_label') || 'Attachment (Optional)'}
                            </label>
                            <span className="text-[10px] text-stone-400 font-medium">
                                {t('feedback_modal.max_size_hint') || 'Max size: 3MB'}
                            </span>
                        </div>
                        <input 
                            type="file"
                            id="feedback-file-upload"
                            className="hidden"
                            accept="image/*,application/pdf,video/*"
                            onChange={handleFileChange}
                            disabled={isSending || isUploading}
                        />
                        {selectedFile ? (
                            <div className="relative overflow-hidden bg-stone-50 border border-stone-200 rounded-full h-[46px] flex items-center justify-between px-6 py-3 text-sm font-sans font-medium text-stone-700">
                                {/* Progress bar background fill */}
                                {isUploading && (
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 bg-stone-200/50 transition-all duration-300 ease-out z-0"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                )}
                                <span className="relative z-10 truncate max-w-[70%] text-stone-750">
                                    {selectedFile.name}
                                </span>
                                <span className="relative z-10 text-xs font-semibold text-stone-500">
                                    {isUploading 
                                        ? `${Math.round(uploadProgress)}%` 
                                        : `(${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`
                                    }
                                </span>
                                <button 
                                    type="button" 
                                    onClick={handleRemoveFile}
                                    className="relative z-10 p-1 hover:bg-stone-200/60 rounded-full transition-colors text-stone-400 hover:text-stone-700 cursor-pointer shrink-0"
                                    disabled={isSending}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                                        <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <label 
                                htmlFor="feedback-file-upload"
                                className="w-full flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 border border-stone-250 rounded-full px-6 py-3.5 text-[15px] font-sans font-medium text-stone-600 cursor-pointer transition-all border-dashed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className="text-stone-500">
                                    <path d="M208.25,123.76a6,6,0,0,1,0,8.49l-82.06,82a54,54,0,0,1-76.36-76.39L149.1,37.14a38,38,0,1,1,53.77,53.72L103.59,191.54a22,22,0,1,1-31.15-31.09l83.28-84.67a6,6,0,0,1,8.56,8.42L81,168.91a10,10,0,1,0,14.11,14.18L194.35,82.4a26,26,0,1,0-36.74-36.8L58.33,146.28a42,42,0,1,0,59.37,59.44l82.06-82A6,6,0,0,1,208.25,123.76Z"></path>
                                </svg>
                                <span>{t('feedback_modal.upload_placeholder') || 'Attach an image, video, or PDF'}</span>
                            </label>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3.5 mt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 bg-stone-100/75 hover:bg-stone-200/50 text-stone-600 rounded-full text-[15px] font-sans font-medium transition-colors cursor-pointer"
                            disabled={isSending}
                        >
                            {t('common.close') || 'Close'}
                        </button>
                        <button 
                            type="submit"
                            disabled={isSending || isUploading || !subject.trim() || !message.trim()}
                            className={`px-8 py-3 rounded-full text-[15px] font-sans font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                isSending 
                                    ? 'bg-stone-850 text-stone-300' 
                                    : 'bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                            {isSending && (
                                <svg className="animate-spin h-4 w-4 text-stone-300" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            <span>
                                {isSending 
                                    ? (t('feedback_modal.sending') || 'Sending...') 
                                    : (t('feedback_modal.send') || 'Send Feedback')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Status Message */}
                {status.message && status.type === 'error' && (
                    <p className="text-xs font-semibold text-center -mt-2 px-1 text-red-650">
                        {status.message}
                    </p>
                )}
            </form>
        </div>,
        document.body
    );
}
