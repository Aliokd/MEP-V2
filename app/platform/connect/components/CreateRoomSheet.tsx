"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { createRoom, DETAILS_MAX, MAX_SEATS, MIN_SEATS, ROOM_TOPICS, type RoomTopic, type RoomType } from '@/lib/rooms';

interface CreateRoomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (roomId: string) => void;
}

/**
 * The questions a host answers before a room exists. Fixed topics, a title in
 * their own words, when, how long, where, and how many seats — so a room is
 * never an empty box someone has to guess the purpose of.
 */
export default function CreateRoomSheet({ isOpen, onClose, onCreated }: CreateRoomSheetProps) {
    const { t } = useLanguage();
    const { user } = useAuth();

    const [topic, setTopic] = useState<RoomTopic>('lyrics');
    const [type, setType] = useState<RoomType>('collab');
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [durationMin, setDurationMin] = useState(45);
    const [location, setLocation] = useState('');
    const [seats, setSeats] = useState(MIN_SEATS);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || typeof document === 'undefined') return null;

    const canSubmit = title.trim().length > 0 && startsAt !== '' && !saving && Boolean(user);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !canSubmit) return;
        setSaving(true);
        setError('');
        try {
            const id = await createRoom({
                hostUid: user.uid,
                hostName: user.displayName || user.email?.split('@')[0] || t('connect.room_someone'),
                type,
                topic,
                title,
                details,
                startsAt: new Date(startsAt).getTime(),
                durationMin,
                location: location || (type === 'collab' ? t('connect.room_on_canvas') : ''),
                seats,
            });
            onCreated(id);
            onClose();
        } catch (err) {
            console.error('Error creating room:', err);
            setError(t('connect.room_create_error'));
        } finally {
            setSaving(false);
        }
    };

    const field = 'w-full bg-white border border-stone-200/70 rounded-full px-5 h-12 text-[15px] font-medium outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400';
    const label = 'block text-xs text-stone-400 font-medium mb-1.5';

    return createPortal(
        <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-lg z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-b from-[#FAF9F5] via-[#F6F6F0] to-[#EBEBE3] rounded-[24px] border border-stone-200/70 shadow-[0_20px_50px_rgba(0,0,0,0.12)] max-w-md w-full max-h-[90dvh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-8 flex flex-col gap-5 animate-in zoom-in-95 duration-200 relative"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close')}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors text-stone-600 hover:text-stone-900 active:scale-95"
                >
                    <X className="w-4 h-4" />
                </button>

                <h3 className="text-2xl font-sans font-light text-stone-800 tracking-[-0.025em] leading-[1.3] pr-10">
                    {t('connect.room_create_title')}
                </h3>

                {/* Topic first — it's the question the whole room is about. */}
                <div>
                    <span className={label}>{t('connect.room_topic_label')}</span>
                    <div className="flex flex-wrap gap-2">
                        {ROOM_TOPICS.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTopic(id)}
                                aria-pressed={topic === id}
                                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                                    topic === id ? 'bg-stone-900 text-[#FAF9F5]' : 'bg-white/70 text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                {t(`connect.room_topic.${id}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={label} htmlFor="room-title">{t('connect.room_title_label')}</label>
                    <input
                        id="room-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        placeholder={t('connect.room_title_placeholder')}
                        className={field}
                    />
                </div>

                {/* The second question: what you bring, what you're after. Every
                    example room has this half — "I have the lyrics and everything". */}
                <div>
                    <label className={label} htmlFor="room-details">{t('connect.room_details_label')}</label>
                    <textarea
                        id="room-details"
                        value={details}
                        onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))}
                        rows={3}
                        placeholder={t(`connect.room_details_placeholder.${topic}`)}
                        className="w-full bg-white border border-stone-200/70 rounded-[18px] px-5 py-3 text-[15px] font-medium outline-none focus:border-stone-400 transition-colors placeholder:text-stone-400 resize-none"
                    />
                    <p className="text-[11px] text-stone-400 mt-1 text-right">{details.length}/{DETAILS_MAX}</p>
                </div>

                <div>
                    <span className={label}>{t('connect.room_kind_label')}</span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-white/50 p-1.5">
                        {(['collab', 'live'] as RoomType[]).map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => setType(kind)}
                                aria-pressed={type === kind}
                                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                                    type === kind ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                                }`}
                            >
                                {t(`connect.room_type_${kind}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label} htmlFor="room-when">{t('connect.room_when')}</label>
                        <input
                            id="room-when"
                            type="datetime-local"
                            value={startsAt}
                            onChange={(e) => setStartsAt(e.target.value)}
                            className={field}
                        />
                    </div>
                    <div>
                        <label className={label} htmlFor="room-duration">{t('connect.room_duration_label')}</label>
                        <input
                            id="room-duration"
                            type="number"
                            min={15}
                            max={240}
                            step={15}
                            value={durationMin}
                            onChange={(e) => setDurationMin(Number(e.target.value))}
                            className={field}
                        />
                    </div>
                </div>

                <div>
                    <label className={label} htmlFor="room-location">{t('connect.room_location_label')}</label>
                    <input
                        id="room-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={type === 'collab' ? t('connect.room_on_canvas') : t('connect.room_location_placeholder')}
                        className={field}
                    />
                </div>

                <div>
                    <label className={label} htmlFor="room-seats">
                        {t('connect.room_seats_label')} · {seats}
                    </label>
                    <input
                        id="room-seats"
                        type="range"
                        min={MIN_SEATS}
                        max={MAX_SEATS}
                        value={seats}
                        onChange={(e) => setSeats(Number(e.target.value))}
                        className="w-full accent-stone-900"
                    />
                    <p className="text-xs text-stone-400 mt-1">{t('connect.room_seats_hint')}</p>
                </div>

                {error && <p className="text-xs text-red-700">{error}</p>}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full rounded-full bg-[#86BE7F] py-4 text-base font-semibold text-stone-900 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {saving ? t('connect.room_creating') : t('connect.room_create_cta')}
                </button>
            </form>
        </div>,
        document.body,
    );
}
