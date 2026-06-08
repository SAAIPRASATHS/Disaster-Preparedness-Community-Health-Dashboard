import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { submitComplaint } from '../api';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/Motion';
import { useTranslation } from 'react-i18next';

// ── Camera Hook ───────────────────────────────────────
function useCamera() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [active, setActive] = useState(false);
    const [permission, setPermission] = useState('idle'); // idle | requesting | granted | denied

    const start = useCallback(async () => {
        setPermission('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setActive(true);
            setPermission('granted');
        } catch {
            setPermission('denied');
        }
    }, []);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActive(false);
        setPermission('idle');
    }, []);

    const capture = useCallback(() => {
        const video = videoRef.current;
        if (!video) return null;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                resolve(file);
            }, 'image/jpeg', 0.92);
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

    return { videoRef, active, permission, start, stop, capture };
}

// ── Main Page ─────────────────────────────────────────
export default function FileComplaint() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const toast = useToast();
    const camera = useCamera();

    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [mode, setMode] = useState('upload'); // 'upload' | 'camera'
    const [submitting, setSubmitting] = useState(false);

    // Switch to camera mode
    const openCamera = async () => {
        setMode('camera');
        clearImage();
        await camera.start();
    };

    // Switch back to upload mode
    const closeCamera = () => {
        camera.stop();
        setMode('upload');
    };

    // Capture photo from camera
    const handleCapture = async () => {
        const file = await camera.capture();
        if (!file) return;
        camera.stop();
        setMode('upload');
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    // File picker handler
    const handleFileChange = (file) => {
        if (!file) return;
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location.trim() || !description.trim()) {
            toast.error(t('fileComplaint.locationReq'));
            return;
        }
        setSubmitting(true);
        try {
            await submitComplaint({ location, description, imageFile: imageFile || undefined });
            toast.success(t('userDashboard.complaintSubmitted'));
            navigate('/user-dashboard');
        } catch (err) {
            toast.error(err?.response?.data?.error || t('userDashboard.complaintFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <div className="max-w-2xl mx-auto py-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-10 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-semibold mb-6 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--primary)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('fileComplaint.back')}
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white"
                            style={{ background: 'var(--primary)' }}
                        >
                            📝
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">{t('fileComplaint.title')}</h1>
                            <p className="text-sm text-slate-300 font-medium mt-0.5">
                                {t('fileComplaint.subtitle')}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Form card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-5 md:p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Location */}
                        <div>
                            <label className="field-label text-sm">📍 {t('report.location')}</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder={t('userDashboard.complaintLocationPlaceholder')}
                                required
                                className="premium-input text-sm"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="field-label text-sm">📋 {t('fileComplaint.descLabel')}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('fileComplaint.descPlaceholder')}
                                required
                                rows={4}
                                className="premium-input resize-none text-sm"
                            />
                        </div>

                        {/* Photo Evidence */}
                        <div>
                            <label className="field-label text-sm">📸 {t('fileComplaint.photoEvidence')}</label>

                            {/* Mode toggle tabs */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => { closeCamera(); setMode('upload'); }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'upload'
                                        ? 'text-white shadow-md'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    style={mode === 'upload' ? { background: 'var(--primary)' } : {}}
                                >
                                    {t('fileComplaint.uploadFile')}
                                </button>
                                <button
                                    type="button"
                                    onClick={openCamera}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'camera'
                                        ? 'text-white shadow-md'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    style={mode === 'camera' ? { background: 'var(--primary)' } : {}}
                                >
                                    {t('fileComplaint.takePhoto')}
                                </button>
                            </div>

                            <AnimatePresence mode="wait">

                                {/* ── Camera View ── */}
                                {mode === 'camera' && (
                                    <motion.div
                                        key="camera"
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        className="rounded-xl overflow-hidden border-2 border-slate-200"
                                    >
                                        {camera.permission === 'requesting' && (
                                            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 gap-4">
                                                <div className="animate-spin h-6 w-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full" />
                                            </div>
                                        )}

                                        {camera.permission === 'denied' && (
                                            <div className="flex flex-col items-center justify-center py-12 bg-rose-50 gap-2 px-4 text-center">
                                                <span className="text-3xl">🚫</span>
                                                <p className="text-xs font-semibold text-rose-600">{t('fileComplaint.cameraDenied')}</p>
                                                <button type="button" onClick={() => setMode('upload')} className="text-xs text-rose-500 underline mt-1">
                                                    {t('fileComplaint.useUpload')}
                                                </button>
                                            </div>
                                        )}

                                        {camera.permission === 'granted' && (
                                            <div className="relative bg-black">
                                                <video
                                                    ref={camera.videoRef}
                                                    className="w-full max-h-60 object-cover"
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                />
                                                {/* Camera controls overlay */}
                                                <div className="absolute bottom-0 inset-x-0 flex items-center justify-center px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleCapture}
                                                        className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg"
                                                    >
                                                        <div
                                                            className="w-8 h-8 rounded-full"
                                                            style={{ background: 'var(--primary)' }}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* ── Upload / Preview View ── */}
                                {mode === 'upload' && (
                                    <motion.div
                                        key="upload"
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                    >
                                        {imagePreview ? (
                                            /* Image preview */
                                            <div className="relative rounded-xl overflow-hidden border border-indigo-100">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-40 object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            /* Upload drop zone */
                                            <label
                                                htmlFor="complaint-file-input"
                                                className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-indigo-50/30 transition-all"
                                            >
                                                <span className="text-xl">📁</span>
                                                <p className="text-xs font-semibold text-slate-600">
                                                    {t('fileComplaint.clickUpload')}
                                                </p>
                                                <input
                                                    id="complaint-file-input"
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                                    className="sr-only"
                                                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                                                />
                                            </label>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="premium-button w-full py-3 text-sm font-bold shadow-lg"
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                    {t('userDashboard.submittingComplaint')}
                                </div>
                            ) : (
                                t('userDashboard.submitComplaint')
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Info note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-xs text-slate-400 mt-6 font-medium"
                >
                    {t('fileComplaint.formReviewInfo')}
                </motion.p>
            </div>
        </PageTransition>
    );
}
