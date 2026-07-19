"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset form states on close/open
    useEffect(() => {
        if (isOpen) {
            setSubject('');
            setMessage('');
            setSelectedFile(null);
            setStatus({ type: '', message: '' });
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setIsSending(true);
        setStatus({ type: '', message: '' });

        try {
            let attachmentUrl = null;
            let attachmentName = null;

            // 1. Upload attachment to Firebase Storage if present
            if (selectedFile) {
                try {
                    setStatus({ type: '', message: t('feedback_modal.uploading_file') || 'Uploading attachment...' });
                    const fileExtension = selectedFile.name.split('.').pop();
                    const storagePath = `feedback_attachments/${user?.uid || 'anonymous'}/${Date.now()}.${fileExtension}`;
                    const storageRef = ref(storage, storagePath);
                    
                    const snapshot = await uploadBytes(storageRef, selectedFile);
                    attachmentUrl = await getDownloadURL(snapshot.ref);
                    attachmentName = selectedFile.name;
                } catch (uploadError) {
                    console.error('Error uploading feedback attachment:', uploadError);
                    throw new Error('Failed to upload attachment. Please check file size or try again.');
                }
            }

            const feedbackData: any = {
                userId: user?.uid || 'anonymous',
                userName: user?.displayName || 'Anonymous User',
                userEmail: user?.email || 'no-email@veinote.com',
                subject: subject.trim(),
                message: message.trim(),
                createdAt: serverTimestamp(),
                status: 'received'
            };

            if (attachmentUrl) {
                feedbackData.attachmentUrl = attachmentUrl;
                feedbackData.attachmentName = attachmentName;
            }

            // 2. Write the feedback to Firestore
            await addDoc(collection(db, "user_feedback"), feedbackData);

            // 3. Call our API route to email the feedback
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: feedbackData.userId,
                    userName: feedbackData.userName,
                    userEmail: feedbackData.userEmail,
                    subject: feedbackData.subject,
                    message: feedbackData.message,
                    attachmentUrl: attachmentUrl,
                    attachmentName: attachmentName
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'API call failed');
            }

            // Success!
            setStatus({
                type: 'success',
                message: t('feedback_modal.success') || 'Thank you for your feedback! We review all suggestions to improve the platform.'
            });
            setSubject('');
            setMessage('');
            setSelectedFile(null);

            // Auto-close modal after success message
            setTimeout(() => {
                onClose();
            }, 3000);

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
                        <label className="text-[10px] uppercase tracking-widest text-stone-700 font-bold px-1">
                            {t('feedback_modal.attachment_label') || 'Attachment (Optional)'}
                        </label>
                        <input 
                            type="file"
                            id="feedback-file-upload"
                            className="hidden"
                            accept="image/*,application/pdf,video/*"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setSelectedFile(e.target.files[0]);
                                }
                            }}
                            disabled={isSending}
                        />
                        {selectedFile ? (
                            <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-full px-6 py-3 text-sm font-sans font-medium text-stone-700">
                                <span className="truncate max-w-[85%]">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedFile(null)}
                                    className="text-stone-400 hover:text-stone-700 font-bold cursor-pointer transition-colors"
                                    disabled={isSending}
                                >
                                    {t('profile.cancel') || 'Cancel'}
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
                            disabled={isSending || !subject.trim() || !message.trim()}
                            className="px-8 py-3 bg-stone-900 hover:bg-stone-855 text-white rounded-full text-[15px] font-sans font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {isSending 
                                ? (t('feedback_modal.sending') || 'Sending...') 
                                : (t('feedback_modal.send') || 'Send Feedback')}
                        </button>
                    </div>
                </div>

                {/* Status Message */}
                {status.message && (
                    <p className={`text-xs font-semibold text-center -mt-2 px-1 ${
                        status.type === 'success' ? 'text-emerald-650' : status.type === 'error' ? 'text-red-650' : 'text-stone-500'
                    }`}>
                        {status.message}
                    </p>
                )}
            </form>
        </div>,
        document.body
    );
}
