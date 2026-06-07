"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, ArrowUpRight, ArrowRight, MousePointer2, Plus, Menu, Heart } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const TopNav = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 flex items-center justify-between z-50 transition-all duration-300 ${
            isScrolled 
                ? "py-4 px-6 md:px-[10%] bg-[#E6E3DB]/85 backdrop-blur-lg border-b border-stone-300/10 shadow-sm" 
                : "py-8 px-6 md:px-[10%] bg-transparent"
        }`}>
            <Link href="/" className="hover:opacity-80 transition-opacity">
                <svg width="151" height="39" viewBox="0 0 151 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[120px] md:w-[151px] h-auto">
                    <path d="M26.8756 9.80365C27.7045 8.52842 28.0552 7.52417 27.9276 6.79091C27.832 6.05765 27.4016 5.51568 26.6365 5.16499C25.8713 4.8143 24.8671 4.59113 23.6237 4.49549L23.8628 3.53906C24.1816 3.57094 24.7555 3.60282 25.5844 3.6347C26.4452 3.6347 27.3538 3.65064 28.3102 3.68252C29.2985 3.68252 30.0796 3.68252 30.6535 3.68252C31.323 3.68252 31.9606 3.66658 32.5663 3.6347C33.172 3.60282 33.73 3.57094 34.2401 3.53906L34.0009 4.49549C33.2358 4.71865 32.5344 5.02152 31.8968 5.40409C31.2911 5.75478 30.6535 6.3127 29.984 7.07784C29.3145 7.8111 28.5493 8.84723 27.6885 10.1862L9.85119 37.6357C9.24545 37.5719 8.63972 37.54 8.03398 37.54C7.46012 37.54 6.87033 37.5719 6.26459 37.6357L2.48671 7.55605C2.35918 6.40834 2.02444 5.62726 1.48246 5.21281C0.940486 4.76647 0.446332 4.52737 0 4.49549L0.239107 3.53906C1.16365 3.57094 2.35918 3.60282 3.8257 3.6347C5.32411 3.66658 6.80657 3.68252 8.27309 3.68252C9.99465 3.68252 11.5728 3.66658 13.0074 3.6347C14.4739 3.60282 15.6694 3.57094 16.594 3.53906L16.3549 4.49549C15.3347 4.52737 14.5217 4.65489 13.916 4.87806C13.3103 5.10122 12.8958 5.48379 12.6726 6.02577C12.4814 6.56774 12.4335 7.39665 12.5292 8.51248L14.8246 29.6017L12.6726 31.6102L26.8756 9.80365Z" fill="#363636"/>
                    <path d="M134.341 27.212C135.521 26.7019 136.653 26.1281 137.737 25.4905C138.821 24.821 139.777 24.1036 140.606 23.3385C141.849 22.1589 142.869 20.804 143.666 19.2737C144.463 17.7115 144.862 16.0378 144.862 14.2525C144.862 13.7105 144.798 13.3438 144.671 13.1526C144.543 12.9613 144.352 12.8656 144.097 12.8656C143.427 12.8656 142.694 13.2323 141.897 13.9655C141.1 14.6669 140.319 15.6233 139.554 16.8348C138.789 18.0144 138.087 19.3693 137.45 20.8996C136.844 22.398 136.35 23.9602 135.967 25.5861C135.585 27.1801 135.393 28.7423 135.393 30.2726C135.393 32.0898 135.744 33.3172 136.445 33.9548C137.179 34.5925 138.119 34.9113 139.267 34.9113C140 34.9113 141.004 34.6562 142.28 34.1461C143.555 33.6041 144.814 32.6477 146.058 31.2768L146.823 31.6594C146.153 32.7115 145.26 33.7317 144.145 34.72C143.029 35.7083 141.722 36.5212 140.223 37.1589C138.725 37.7646 137.067 38.0675 135.25 38.0675C133.783 38.0675 132.444 37.8124 131.233 37.3023C130.053 36.7922 129.113 36.043 128.411 35.0547C127.71 34.0345 127.359 32.7912 127.359 31.3247C127.359 29.5393 127.646 27.7381 128.22 25.9209C128.794 24.1036 129.607 22.3661 130.659 20.7083C131.711 19.0186 132.97 17.5202 134.437 16.2131C135.935 14.906 137.577 13.8699 139.363 13.1047C141.148 12.3396 143.077 11.957 145.149 11.957C146.679 11.957 147.97 12.2918 149.022 12.9613C150.074 13.5989 150.601 14.6031 150.601 15.974C150.601 17.1855 150.266 18.3332 149.596 19.4172C148.927 20.4692 148.018 21.4416 146.87 22.3343C145.755 23.2269 144.479 24.0239 143.045 24.7253C141.642 25.4267 140.191 26.0324 138.693 26.5425C137.195 27.0526 135.728 27.4511 134.293 27.7381L134.341 27.212Z" fill="#363636"/>
                    <path d="M131.023 12.626L130.879 13.5824H113.711L113.951 12.626H131.023ZM119.928 33.3326C119.705 34.0658 119.705 34.6238 119.928 35.0063C120.151 35.357 120.502 35.5324 120.98 35.5324C121.618 35.5324 122.255 35.1976 122.893 34.5281C123.563 33.8267 124.121 32.8703 124.567 31.6588L125.332 29.6503H126.241L125.332 32.3762C124.694 34.2252 123.738 35.6439 122.463 36.6323C121.219 37.5887 119.705 38.0669 117.92 38.0669C116.389 38.0669 115.21 37.7162 114.381 37.0148C113.552 36.2816 113.058 35.3251 112.898 34.1455C112.739 32.9341 112.867 31.5951 113.281 30.1286L120.359 5.5484C121.921 5.51652 123.323 5.45276 124.567 5.35712C125.81 5.26147 127.022 5.10207 128.201 4.87891L119.928 33.3326Z" fill="#363636"/>
                    <path d="M102.856 12.9135C102.219 12.9135 101.501 13.3598 100.704 14.2525C99.9391 15.1451 99.174 16.3407 98.4088 17.8391C97.6437 19.3375 96.9423 21.0112 96.3047 22.8603C95.6671 24.7094 95.157 26.6063 94.7744 28.551C94.3918 30.4958 94.2005 32.3608 94.2005 34.1461C94.2005 35.2301 94.2962 35.9952 94.4875 36.4415C94.7106 36.8879 95.0454 37.111 95.4917 37.111C96.0974 37.111 96.7829 36.6966 97.548 35.8677C98.3132 35.0069 99.0624 33.8592 99.7956 32.4246C100.561 30.958 101.262 29.3162 101.9 27.499C102.537 25.6499 103.047 23.737 103.43 21.7604C103.845 19.7838 104.052 17.855 104.052 15.974C104.052 14.6988 103.94 13.8699 103.717 13.4873C103.494 13.1047 103.207 12.9135 102.856 12.9135ZM87.0273 30.0813C87.0273 28.5829 87.2346 27.0048 87.649 25.347C88.0635 23.6892 88.6851 22.0792 89.5141 20.517C90.343 18.923 91.395 17.4884 92.6703 16.2131C93.9774 14.906 95.4917 13.8699 97.2133 13.1047C98.9348 12.3396 100.896 11.957 103.095 11.957C105.71 11.957 107.718 12.6425 109.121 14.0133C110.524 15.3842 111.225 17.3608 111.225 19.9432C111.225 21.4416 111.018 23.0197 110.603 24.6775C110.189 26.3353 109.567 27.9612 108.738 29.5553C107.909 31.1174 106.841 32.5521 105.534 33.8592C104.259 35.1344 102.761 36.1546 101.039 36.9198C99.3174 37.6849 97.3567 38.0675 95.157 38.0675C92.5427 38.0675 90.5342 37.382 89.1315 36.0111C87.7287 34.6403 87.0273 32.6637 87.0273 30.0813Z" fill="#363636"/>
                    <path d="M66.5958 37.398H58.9922L64.8264 16.6913C64.9858 16.2131 65.0814 15.8146 65.1133 15.4958C65.1452 15.177 65.0974 14.9379 64.9699 14.7785C64.8742 14.5872 64.667 14.4916 64.3482 14.4916C63.8062 14.4916 63.312 14.7307 62.8657 15.2089C62.4513 15.6871 61.989 16.5798 61.4789 17.8869L60.4746 20.5649H59.566L60.905 16.8826C61.5108 15.1292 62.3397 13.8699 63.3917 13.1047C64.4438 12.3396 65.735 11.957 67.2653 11.957C68.4449 11.957 69.3694 12.1643 70.0389 12.5787C70.7403 12.9613 71.2185 13.4873 71.4735 14.1568C71.7286 14.8263 71.8402 15.5596 71.8083 16.3566C71.7764 17.1217 71.6648 17.8869 71.4735 18.652L66.5958 37.398ZM67.9348 29.9378C69.21 26.2397 70.3896 23.2269 71.4735 20.8996C72.5575 18.5723 73.6096 16.7551 74.6298 15.448C75.6818 14.109 76.7498 13.2004 77.8338 12.7222C78.9496 12.2121 80.1292 11.957 81.3726 11.957C82.9347 11.957 84.0665 12.2918 84.7679 12.9613C85.4693 13.5989 85.8359 14.4756 85.8678 15.5914C85.8996 16.6754 85.6924 17.8709 85.2461 19.178L80.5118 33.3332C80.2248 34.2258 80.177 34.8156 80.3683 35.1025C80.5596 35.3895 80.8146 35.3399 81.1335 35.5329C81.4841 35.5329 81.8986 35.3417 82.3768 34.9591C82.855 34.5446 83.3651 33.6041 83.9071 32.1376L84.8157 29.6509H85.7243L84.5288 33.1419C84.0824 34.4809 83.4926 35.5011 82.7594 36.2024C82.058 36.9038 81.2769 37.382 80.4161 37.6371C79.5872 37.924 78.7583 38.0675 77.9294 38.0675C76.973 38.0675 76.1441 37.924 75.4427 37.6371C74.7732 37.3501 74.2472 36.9357 73.8646 36.3937C73.4183 35.7561 73.1792 34.9431 73.1473 33.9548C73.1473 32.9665 73.4023 31.6913 73.9124 30.1291L78.1207 17.5043C78.312 16.9623 78.4395 16.4841 78.5033 16.0697C78.567 15.6233 78.5511 15.2726 78.4555 15.0176C78.3598 14.7625 78.1526 14.635 77.8338 14.635C77.2599 14.635 76.6064 15.0495 75.8731 15.8784C75.1399 16.7073 74.3747 17.8391 73.5777 19.2737C72.7807 20.7083 71.9677 22.3661 71.1388 24.2471C70.3099 26.1281 69.5129 28.1366 68.7477 30.2726C68.0145 32.3767 67.3769 34.4968 66.8349 36.6328L67.9348 29.9378Z" fill="#363636"/>
                    <path d="M51.7705 5.06906C51.7705 3.34749 52.3284 2.07226 53.4442 1.24335C54.56 0.414451 55.9469 0 57.6047 0C59.0074 0 60.0595 0.270987 60.7609 0.812963C61.4941 1.35494 61.8608 2.1679 61.8608 3.25185C61.8608 4.75025 61.2869 5.96172 60.1392 6.88627C59.0234 7.77893 57.6366 8.22527 55.9787 8.22527C54.6079 8.22527 53.5558 7.95428 52.8225 7.4123C52.1212 6.87033 51.7705 6.08925 51.7705 5.06906ZM49.762 16.6418C50.2083 15.3028 50.0648 14.6333 49.3316 14.6333C48.8534 14.6333 48.407 14.8565 47.9926 15.3028C47.5781 15.7173 47.1477 16.4984 46.7014 17.6461L45.6015 20.5632H44.6929L46.0319 16.8331C46.4782 15.6216 47.0362 14.6652 47.7057 13.9638C48.407 13.2306 49.22 12.7045 50.1445 12.3857C51.0691 12.0669 52.0733 11.9075 53.1573 11.9075C54.3688 11.9075 55.3411 12.1147 56.0744 12.5292C56.8076 12.9436 57.3337 13.4856 57.6525 14.1551C57.9713 14.7927 58.1307 15.51 58.1307 16.3071C58.1307 17.0722 58.0032 17.8373 57.7481 18.6025L52.7747 33.3315C52.5197 34.1285 52.4719 34.6704 52.6313 34.9574C52.7907 35.2124 53.0298 35.3399 53.3486 35.3399C53.6355 35.3399 54.0021 35.1805 54.4485 34.8617C54.8948 34.511 55.373 33.6662 55.8831 32.3272L56.8874 29.6492H57.796L56.6004 33.1402C56.1222 34.4792 55.5165 35.4994 54.7832 36.2007C54.05 36.9021 53.237 37.3803 52.3443 37.6354C51.4835 37.9223 50.6228 38.0658 49.762 38.0658C48.3592 38.0658 47.2115 37.7788 46.3188 37.205C45.4581 36.5992 44.932 35.6906 44.7407 34.4792C44.5495 33.2358 44.7567 31.6896 45.3624 29.8405L49.762 16.6418Z" fill="#363636"/>
                    <path d="M28.91 27.3525C29.9302 26.8743 30.9345 26.3005 31.9228 25.631C32.9111 24.9615 33.8197 24.2282 34.6486 23.4312C35.9238 22.1878 36.96 20.7691 37.757 19.1751C38.5859 17.581 39.0003 15.8595 39.0003 14.0104C39.0003 13.5641 38.9366 13.2612 38.8091 13.1018C38.6815 12.9105 38.4902 12.8149 38.2352 12.8149C37.5976 12.8149 36.8962 13.1815 36.1311 13.9147C35.3978 14.6161 34.6645 15.5726 33.9313 16.784C33.198 17.9636 32.5285 19.3026 31.9228 20.801C31.3489 22.2994 30.8707 23.8456 30.4881 25.4397C30.1375 27.0018 29.9621 28.5162 29.9621 29.9827C29.9621 31.8318 30.3287 33.0752 31.062 33.7128C31.7953 34.3185 32.7517 34.6214 33.9313 34.6214C34.5689 34.6214 35.5253 34.3823 36.8006 33.9041C38.0758 33.4258 39.351 32.5491 40.6263 31.2739L41.3914 31.6565C40.69 32.7085 39.7655 33.7287 38.6178 34.717C37.4701 35.7053 36.1151 36.5183 34.553 37.1559C32.9908 37.7616 31.2374 38.0645 29.2926 38.0645C27.7942 38.0645 26.4074 37.8095 25.1322 37.2994C23.8888 36.7893 22.8846 36.0401 22.1194 35.0518C21.3862 34.0316 21.0195 32.7882 21.0195 31.3217C21.0195 29.4407 21.3065 27.5757 21.8803 25.7266C22.4861 23.8775 23.3309 22.1241 24.4148 20.4663C25.4988 18.8085 26.79 17.3419 28.2884 16.0667C29.8187 14.7596 31.5083 13.7394 33.3574 13.0061C35.2065 12.2729 37.1831 11.9062 39.2873 11.9062C40.977 11.9062 42.3797 12.2569 43.4955 12.9583C44.6433 13.6278 45.2171 16.1145 45.2171 16.1145C45.2171 17.326 44.8983 18.4737 44.2607 19.5577C43.6231 20.6097 42.7463 21.5821 41.6305 22.4748C40.5147 23.3355 39.2554 24.1166 37.8526 24.818C36.4499 25.5194 34.9674 26.1251 33.4052 26.6352C31.875 27.1453 30.3606 27.5438 28.8622 27.8307L28.91 27.3525Z" fill="#363636"/>
                </svg>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-10 text-[15px] text-[#363636]">
                <Link href="#qa" className="hover:text-black transition-colors font-medium">Q&A</Link>
                <div className="flex items-center gap-6">
                    <Link href="/signin" className="hover:text-black transition-colors font-medium">Sign in</Link>
                    <Link href="/onboarding" className="bg-[#86BE7F] hover:opacity-90 text-stone-900 px-4 py-1.5 rounded-[15px] font-semibold transition-all">Join now</Link>
                </div>
            </div>

            {/* Mobile Nav */}
            <div className="flex items-center gap-6 text-[15px] text-[#363636] md:hidden">
                <Link href="#qa" className="hover:text-black transition-colors font-medium">Q&A</Link>
                <div className="flex items-center gap-4">
                    <Link href="/signin" className="hover:text-black transition-colors font-medium">Sign in</Link>
                    <Link href="/onboarding" className="bg-[#86BE7F] hover:opacity-90 text-stone-900 px-3 py-1 rounded-[12px] font-semibold text-xs transition-all">Join now</Link>
                </div>
            </div>
        </nav>
    );
};

const HeroSection = () => {
    return (
        <section className="relative min-h-0 md:min-h-[90vh] bg-[#E6E3DB] pt-32 pb-0 md:pb-16 flex flex-col items-center overflow-hidden">
            <TopNav />
            <div className="w-full px-6 md:px-[10%] flex flex-col md:flex-row justify-between items-start mb-16 relative z-20">
                <h1 className="text-5xl md:text-[5.5rem] font-sans text-stone-800 leading-[1.05] tracking-tight">
                    <span className="block md:inline">The complete</span>{' '}
                    <span className="block md:inline font-bold text-stone-900">songwriting</span>{' '}
                    <span className="block md:inline">journey.</span>
                </h1>
                <div className="flex flex-col items-start mt-8 md:mt-0 max-w-[350px]">
                    <p className="text-[14px] md:text-[15px] text-stone-600 mb-6 text-left leading-relaxed font-normal">
                        From your first lyric idea to a finished song, Veinote combines powerful creative tools, expert guidance, practical exercises, and a supportive community designed to help songwriters grow and develop their craft.
                    </p>
                    <Link 
                        href="/onboarding" 
                        className="bg-[#86BE7F] hover:opacity-90 text-stone-900 px-8 py-4 rounded-[20px] text-xl font-semibold transition-all inline-flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)] select-none"
                    >
                        <span>Join now</span>
                        <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                    </Link>
                </div>
            </div>

            <div className="w-full px-0 md:px-[10%] relative z-10 flex flex-col items-center -mb-[2px] md:mb-0">
                <motion.div 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full rounded-none md:rounded-[32px] relative overflow-hidden flex"
                >
                    <video 
                        src="/videos/hero_video.webm" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-auto block scale-[1.01]"
                    />
                </motion.div>
            </div>
        </section>
    );
};

const YellowBanner = () => (
    <Link 
        href="https://www.forskning.no/kunstig-intelligens-musikk-partner/derfor-sliter-musikere-med-a-fullfore-latene-sine/2636211"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#FFF35F] w-full py-4 md:py-6 lg:py-8 px-6 flex justify-center items-center text-center group transition-all hover:brightness-95 cursor-pointer"
    >
        <p className="text-[17px] md:text-[22px] lg:text-[26px] font-medium text-stone-900 flex items-center justify-center gap-2 flex-wrap">
            Here's why 92% of musicians never finish their songs. 
            <span className="font-semibold flex items-center ml-1">
                <span className="underline decoration-[1.5px] underline-offset-4 group-hover:opacity-70 transition-opacity">Learn more</span> 
                <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ml-0.5 stroke-[2px] group-hover:opacity-70 transition-opacity" />
            </span>
        </p>
    </Link>
);

const BlobsSection = () => {
    return (
        <section className="bg-[#E6E3DB] pb-0 flex flex-col items-center overflow-hidden">
            <div className="text-center mb-0 relative w-full flex flex-col items-center">
                <div className="w-full">
                    <img src="/assets/Up.png" alt="My song Finished" className="w-full h-auto block" />
                </div>
                <span className="font-sans font-extralight text-5xl md:text-7xl lg:text-8xl text-stone-500 -mt-[3.5%] tracking-wide px-6 z-10 relative">and...</span>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8 }} 
                viewport={{ once: true }} 
                className="w-full -mt-[2.5%]"
            >
                <img src="/assets/Down.svg" alt="Songwriting benefits" className="w-full h-auto block" />
            </motion.div>
        </section>
    );
};

const UrgencySection = () => {
    const [count, setCount] = useState(0);
    const [barWidth, setBarWidth] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);

                    // Kick off progress bar CSS transition
                    setTimeout(() => setBarWidth(87), 50);

                    // Count-up from 0 → 87 over 1600ms with easeOut
                    const target = 87;
                    const duration = 1600;
                    const startTime = performance.now();

                    const tick = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // easeOutCubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.round(eased * target));
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [hasAnimated]);

    return (
        <section ref={sectionRef} className="bg-[#EDFF8E] py-24 md:py-32 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* 100% Free Access blob — bottom left */}
            <img
                src="/assets/100%25%20free%20access.svg"
                alt="100% Free Access"
                className="absolute bottom-0 left-0 w-[200px] sm:w-[280px] md:w-[360px] lg:w-[420px] h-auto select-none pointer-events-none z-10"
            />

            {/* Decorative shapes — bottom right */}
            <img
                src="/assets/Svg founder section.svg"
                alt=""
                className="absolute bottom-0 right-0 w-[220px] sm:w-[300px] md:w-[400px] lg:w-[480px] h-auto select-none pointer-events-none z-10"
            />

            <div className="w-full max-w-3xl relative z-20 flex flex-col items-center">
                {/* Title */}
                <h2 className="text-5xl md:text-[4.5rem] lg:text-[5rem] font-sans tracking-tight text-stone-900 font-light mb-6 md:mb-8 leading-[1.05]">
                    Join the early founders
                </h2>

                {/* Animated progress bar */}
                <div className="w-full max-w-2xl h-3 rounded-full overflow-hidden mb-8 md:mb-10" style={{ background: '#D5E776' }}>
                    <div
                        className="h-full bg-stone-900 rounded-full"
                        style={{
                            width: `${barWidth}%`,
                            transition: 'width 1.6s cubic-bezier(0.33, 1, 0.68, 1)',
                        }}
                    />
                </div>

                {/* Animated 87 / 100 counter */}
                <div className="flex items-baseline justify-center gap-1 leading-none mb-6 md:mb-8">
                    <span className="text-[7rem] md:text-[9rem] lg:text-[11rem] font-sans font-bold tracking-tighter text-stone-900 leading-none tabular-nums">
                        {count}
                    </span>
                    <span className="text-[4rem] md:text-[5.5rem] lg:text-[6.5rem] font-sans font-light tracking-tight text-stone-900/60 leading-none">/100</span>
                </div>

                {/* Urgency Description */}
                <p className="text-stone-700 text-[15px] md:text-[17px] font-medium max-w-md mb-10 leading-relaxed">
                    Only 13 spots left<br className="hidden md:block" /> before early access closes.
                </p>

                {/* CTA Button */}
                <Link
                    href="/onboarding"
                    className="bg-[#86BE7F] hover:opacity-90 text-stone-900 px-8 py-4 rounded-[20px] text-xl font-semibold transition-all inline-flex items-center gap-3 select-none"
                >
                    <span>Join now</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                </Link>
            </div>
        </section>
    );
};


const DarkSection = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let intervalId: any = null;

        const handleEnded = () => {
            // When forward play ends, pause and start reverse playback
            video.pause();
            
            // Decrement currentTime at ~30fps for ultra-smooth reverse seek
            const fps = 30;
            const step = 1 / fps;
            
            intervalId = setInterval(() => {
                if (video.currentTime > 0.05) {
                    video.currentTime = Math.max(0, video.currentTime - step);
                } else {
                    // Reached the beginning, play forward again
                    clearInterval(intervalId);
                    video.currentTime = 0;
                    video.play().catch(() => {});
                }
            }, 1000 / fps);
        };

        video.addEventListener("ended", handleEnded);

        return () => {
            video.removeEventListener("ended", handleEnded);
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return (
        <section className="relative w-full min-h-[90vh] md:min-h-screen flex flex-col justify-center text-white overflow-hidden py-24 md:py-32 px-6 md:px-[10%]">
            {/* Background Video */}
            <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            >
                <source src="/assets/Peter video 2.mp4" type="video/mp4" />
            </video>

            {/* Dark gradient overlay to ensure text contrast and focus on text/guitarist */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent z-10 pointer-events-none" />
            
            {/* Additional overall darkening layer for mobile/small screens */}
            <div className="absolute inset-0 bg-black/20 z-10 md:hidden pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-20 max-w-3xl flex flex-col items-start justify-center flex-grow">
                <h2 className="text-5xl md:text-[5.5rem] font-sans leading-[1.05] tracking-tight mb-12 md:mb-16">
                    <span className="font-normal text-white/90">Learn from</span> <br />
                    <span className="font-semibold text-white">experienced professionals</span>
                </h2>

                <div className="flex flex-col items-start pl-2 md:pl-4">
                    {/* Musical Icon & Name */}
                    <div className="flex items-center gap-3 text-white/90 mb-1">
                        <svg 
                            className="w-5 h-5 md:w-6 md:h-6 stroke-[1.5px] fill-none text-white/95" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" 
                            />
                        </svg>
                        <span className="text-xl md:text-2xl font-semibold tracking-wide text-white">Peter Nordberg</span>
                    </div>

                    {/* Subtitle */}
                    <div className="mt-1.5">
                        <span className="text-sm md:text-base text-white/60 italic font-normal">
                            Co-founder • singer-songwriter • producer
                        </span>
                    </div>

                    {/* Bullet Points */}
                    <ul className="flex flex-col gap-2 mt-4 text-sm md:text-base text-white/80 font-normal text-left">
                        <li className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 bg-[#86BE7F] rounded-full shrink-0" />
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <span>Platinum-selling and top 2% songwriter worldwide</span>
                                <div className="flex items-center bg-white/5 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm shrink-0">
                                    <img 
                                        src="/assets/muso_badge.png" 
                                        alt="Muso.AI" 
                                        className="h-2.5 w-auto object-contain opacity-95" 
                                    />
                                </div>
                            </div>
                        </li>
                    </ul>

                    {/* Thin Line */}
                    <div className="w-12 h-[1px] bg-white/30 my-6" />

                    {/* Paragraph */}
                    <div className="space-y-4 max-w-[380px] text-sm md:text-base text-white/70 font-normal leading-relaxed mb-6 text-left">
                        <p>
                            With more than 30 years of songwriting experience and over 250 released songs, Peter helps develop the lessons, exercises, and creative frameworks that guide songwriters throughout Veinote.
                        </p>
                        <p>
                            His career includes chart success, international releases, platinum-selling projects, and decades of experience as a songwriter, producer, performer, and educator.
                        </p>
                    </div>

                    {/* Cursive Signature */}
                    <svg 
                        viewBox="0 0 676 219" 
                        className="h-10 md:h-14 w-auto text-white mt-4 select-none opacity-90"
                    >
                        <path 
                            d="M 95.500 52.642 C 71.198 54.276, 23.467 62.918, 15.250 67.173 C 12.268 68.717, 12.391 70.836, 15.500 71.481 C 16.875 71.766, 19.125 72.234, 20.500 72.519 C 21.875 72.805, 23 72.580, 23 72.019 C 23 71.459, 22.010 71, 20.800 71 C 16.763 71, 20.292 69.184, 29.500 66.521 C 51.394 60.192, 96.479 54.330, 115 55.405 C 135.426 56.590, 146 59.732, 146 64.616 C 146 70.243, 131.991 80.544, 108 92.558 C 94.630 99.254, 74.247 108, 72.014 108 C 71.493 108, 72.872 104.737, 75.078 100.750 C 77.284 96.763, 81.976 87.803, 85.506 80.841 C 90.797 70.403, 91.683 67.981, 90.551 67.042 C 88.892 65.666, 89.568 64.659, 81.281 80.858 C 77.725 87.811, 72.592 97.404, 69.875 102.175 L 64.936 110.849 57.218 113.774 C 52.973 115.383, 48.375 116.972, 47 117.306 C 43.324 118.199, 40.568 120.492, 41.451 121.921 C 41.964 122.751, 43.871 122.976, 47.354 122.618 C 50.184 122.327, 53.089 122.070, 53.809 122.045 C 54.529 122.020, 54.835 121.542, 54.488 120.981 C 53.956 120.120, 60.012 116.683, 60.756 117.424 C 60.897 117.564, 58.459 121.914, 55.338 127.090 C 45.964 142.634, 43.261 150, 46.930 150 C 48.420 150, 51.930 145.973, 54.087 141.790 C 56.095 137.895, 56.795 134.222, 55 137 C 52.530 140.823, 54.385 136.524, 57.656 130.846 C 59.667 127.356, 62.533 122.324, 64.025 119.664 C 66.599 115.074, 67.239 114.628, 76.618 110.886 C 109.330 97.835, 133.517 84.928, 143.985 74.936 C 150.459 68.756, 151.996 65.230, 149.913 61.338 C 148.170 58.080, 144.387 56.187, 136.164 54.458 C 129.198 52.993, 105.812 51.949, 95.500 52.642 M 387.246 58.521 C 381.665 63.299, 371.328 76.392, 353.076 101.804 C 344.660 113.521, 337.668 122.971, 337.538 122.804 C 337.408 122.637, 337.879 118.225, 338.584 113 C 339.953 102.865, 340.256 83.136, 339.106 79.005 C 337.995 75.010, 335.224 75.371, 330.278 80.155 L 325.785 84.500 328.892 78.919 C 330.602 75.850, 332 72.779, 332 72.096 C 332 70.422, 328.900 71.120, 327.982 73 C 320.660 88, 316.419 93.991, 301.436 110.500 C 291.823 121.092, 279.996 135.883, 277.290 140.698 C 273.521 147.403, 278.489 149.521, 282.411 142.881 C 287.116 134.916, 313.561 102.372, 323.350 92.500 C 333.790 81.972, 334.291 81.607, 335.029 84 C 336.974 90.301, 335.236 111.361, 331.441 127.500 C 329.447 135.977, 329.550 137.204, 332.225 136.820 C 333.449 136.644, 334.912 135.600, 335.476 134.500 C 337.456 130.642, 346.356 117.402, 357.306 102.023 C 375.110 77.018, 378.795 72.255, 386.543 64.226 C 393.076 57.455, 394.561 55, 392.121 55 C 391.702 55, 389.509 56.585, 387.246 58.521 M 527.400 77.982 C 522.945 82.374, 519.487 86.153, 519.715 86.381 C 520.148 86.815, 510.179 101.066, 505.387 106.862 C 499.562 113.907, 474.663 128.612, 467.500 129.238 C 464.875 129.467, 464.460 129.147, 464.176 126.672 C 463.582 121.484, 470.172 109.745, 479.217 99.882 C 489.873 88.263, 494.746 81.346, 493.296 79.896 C 492.528 79.128, 491.638 79.123, 490.225 79.880 C 487.449 81.365, 479.626 90.213, 473.921 98.321 C 471.281 102.072, 467.059 106.956, 464.539 109.175 C 460.720 112.537, 459.705 113, 458.446 111.955 C 456.274 110.153, 450.973 111.964, 442.439 117.424 C 437.005 120.901, 432.781 122.589, 423.474 125.005 C 416.888 126.715, 410.712 128.343, 409.750 128.624 C 406.894 129.457, 407.671 126.373, 411.356 122.253 C 419.945 112.647, 418.559 110.593, 406.071 114.424 C 396.225 117.444, 386.318 118.659, 384.057 117.123 C 382.863 116.312, 382.828 115.673, 383.855 113.419 C 386.366 107.908, 381.305 107.527, 378.213 112.996 C 376.823 115.455, 376.024 115.923, 373.969 115.482 C 369.298 114.477, 355.899 125.571, 354.355 131.721 C 351.588 142.746, 367.949 134.510, 378.078 119.780 C 378.395 119.318, 379.970 119.626, 381.578 120.464 C 385.435 122.475, 388.245 122.396, 399.145 119.968 C 404.163 118.850, 408.431 118.098, 408.629 118.296 C 408.828 118.495, 407.655 120.422, 406.023 122.578 C 402.327 127.463, 402.144 130.653, 405.472 132.169 C 407.491 133.089, 409.738 132.778, 417.722 130.473 C 423.100 128.920, 428.259 127.278, 429.187 126.823 C 430.645 126.109, 430.801 126.454, 430.331 129.350 C 429.673 133.403, 431.236 134.326, 436.360 132.911 C 439.980 131.911, 455.799 121.896, 459.708 118.128 C 462.778 115.170, 463.326 115.469, 461.457 119.084 C 460.580 120.780, 459.781 123.979, 459.681 126.192 C 459.532 129.512, 459.976 130.578, 462.215 132.278 C 464.603 134.090, 465.384 134.200, 468.715 133.194 C 473.710 131.685, 482.970 126.130, 492.569 118.885 C 496.847 115.656, 500.518 113.185, 500.727 113.394 C 501.106 113.772, 498.400 117.787, 492.250 125.974 C 488.850 130.500, 488.034 134, 490.378 134 C 491.135 134, 492.278 133.370, 492.917 132.600 C 493.703 131.653, 495.321 131.368, 497.928 131.717 C 500.523 132.065, 504.339 131.400, 509.639 129.675 C 513.962 128.267, 521.209 126.585, 525.742 125.937 C 533.869 124.774, 534.010 124.791, 535.908 127.129 C 537.591 129.203, 538.625 129.484, 544.166 129.371 C 551.674 129.218, 557.002 127.519, 570.679 120.915 C 576.278 118.212, 581.153 116, 581.513 116 C 581.873 116, 580.777 117.756, 579.078 119.902 C 573.193 127.332, 576.984 128.648, 592.500 124.560 C 601.241 122.257, 601.521 122.243, 602.214 124.085 C 602.859 125.797, 603.657 125.919, 610.464 125.344 C 614.869 124.971, 618 125.091, 618 125.631 C 618 126.832, 615.591 130.351, 610.737 136.240 C 608.233 139.278, 604.376 142.270, 599.995 144.572 C 591.915 148.818, 581 158.324, 581 161.115 C 581 166.273, 586.987 163.406, 599.806 152.110 C 608.948 144.054, 610.246 143.334, 626.166 137.479 C 636.540 133.664, 667.131 124.819, 673.489 123.797 C 674.582 123.621, 675.636 122.650, 675.831 121.639 C 676.138 120.046, 675.739 119.893, 672.843 120.496 C 658.989 123.381, 642.582 127.803, 630.390 131.937 C 622.476 134.620, 616 136.477, 616 136.063 C 616 135.649, 616.962 134.453, 618.138 133.405 C 619.923 131.815, 623 126.244, 623 124.604 C 623 123.074, 619.391 121, 616.729 121 C 612.084 121, 614.511 119.520, 622.500 117.481 C 630.613 115.410, 632.942 113.840, 631.135 111.663 C 629.658 109.884, 625.710 110.648, 611.500 115.464 C 601.975 118.693, 583 123.281, 583 122.356 C 583 122.115, 583.977 120.598, 585.171 118.983 C 587.015 116.488, 587.167 115.662, 586.180 113.495 C 584.382 109.550, 582.563 109.531, 576.296 113.388 C 561.291 122.622, 540 128.944, 540 124.165 C 540 123.672, 542.641 122.305, 545.870 121.128 C 552.597 118.675, 557.232 114.619, 556.796 111.568 C 556.088 106.621, 546.895 109.263, 539.668 116.490 C 536.714 119.444, 534.287 120.894, 531.484 121.379 C 529.293 121.758, 526.166 122.335, 524.535 122.661 L 521.570 123.253 524.785 119.592 C 528.426 115.445, 528.724 113.866, 526.318 111.460 C 523.874 109.017, 517.071 110.228, 509.324 114.486 C 505.846 116.398, 503 117.714, 503 117.410 C 503 115.915, 512.776 103.598, 519.596 96.500 C 528.487 87.247, 539.245 73.235, 538.705 71.613 C 537.809 68.921, 534.970 70.520, 527.400 77.982 M 181.096 88.826 L 174.030 96.651 162.765 97.890 C 149.415 99.357, 148 99.704, 148 101.508 C 148 103.847, 149.445 103.999, 158.619 102.631 C 163.503 101.902, 167.852 101.498, 168.281 101.732 C 169.157 102.208, 158.944 110.798, 149.438 117.581 C 136.824 126.583, 115.926 134.844, 112.650 132.124 C 110.324 130.194, 111.869 127.196, 115.855 125.905 C 122.630 123.710, 132.780 118.096, 134.941 115.348 C 137.671 111.878, 137.298 108.613, 134.121 108.164 C 129.602 107.524, 122.871 111.128, 115.492 118.138 C 110.069 123.289, 107.420 125.099, 104.882 125.390 C 103.022 125.602, 101.162 125.827, 100.750 125.888 C 100.338 125.950, 100 126.724, 100 127.609 C 100 128.860, 100.781 129.128, 103.500 128.810 C 106.539 128.455, 107 128.684, 107 130.546 C 107 135.782, 115.101 137.634, 124.124 134.461 C 133.990 130.992, 150.619 120.520, 165.881 108.166 C 168.147 106.332, 170 105.056, 170 105.331 C 170 105.605, 165.050 113.026, 159 121.822 C 152.950 130.617, 148 138.563, 148 139.480 C 148 141.697, 150.961 141.071, 152.393 138.552 C 154.592 134.684, 170.467 111.371, 174.629 105.898 C 179.424 99.592, 178.678 99.806, 200.608 98.447 C 211.981 97.742, 213.762 97.362, 212.344 95.944 C 210.655 94.255, 207.476 94.093, 194.849 95.051 C 188.136 95.561, 182.489 95.822, 182.298 95.632 C 182.108 95.441, 183.988 92.520, 186.476 89.140 C 188.964 85.760, 191 82.546, 191 81.997 C 191 79.318, 187.506 81.727, 181.096 88.826 M 194.309 111.891 C 192.050 113.528, 188.728 116.700, 186.927 118.942 C 184.741 121.661, 182.379 123.359, 179.826 124.047 C 177.450 124.687, 176 125.673, 176 126.650 C 176 127.906, 176.705 128.090, 179.500 127.566 C 182.494 127.004, 183 127.182, 183 128.794 C 183 130.853, 186.791 133.020, 190.297 132.966 C 193.948 132.909, 206.103 127.665, 212.611 123.340 L 218.723 119.278 218.250 123.478 C 217.835 127.154, 218.119 127.949, 220.523 129.839 C 225.274 133.576, 231.664 132.466, 251 124.546 C 257.325 121.955, 265.425 118.930, 269 117.824 C 277.124 115.310, 279.189 113.639, 273 114.586 C 267.313 115.456, 256.709 118.638, 242 123.887 C 224.498 130.133, 222.022 129.614, 223.607 120.030 C 224.378 115.365, 224.323 113.683, 223.372 112.894 C 222.041 111.789, 218 113.313, 218 114.920 C 218 117.046, 197.726 127.618, 192.871 128.023 C 185.131 128.670, 185.186 127.084, 193.050 122.893 C 199.693 119.352, 203.313 115.223, 202.819 111.748 C 202.347 108.420, 199.023 108.476, 194.309 111.891 M 124.946 114.849 C 122.501 116.415, 119.609 118.703, 118.519 119.932 L 116.539 122.167 119.519 120.856 C 124.902 118.487, 131.343 114.471, 131.759 113.224 C 132.441 111.176, 129.631 111.846, 124.946 114.849 M 193.766 117.097 L 190.500 120.193 193.720 118.050 C 195.491 116.871, 197.205 115.478, 197.529 114.953 C 198.688 113.077, 196.976 114.052, 193.766 117.097 M 517 114.654 C 512.591 116.113, 506.289 119.873, 502.635 123.225 L 498.500 127.017 501.500 126.421 C 510.437 124.646, 515.380 122.652, 519.041 119.344 C 521.219 117.377, 523 115.370, 523 114.884 C 523 113.950, 519.528 113.818, 517 114.654 M 547 115.500 C 545.550 116.329, 545.130 116.931, 546 116.933 C 546.825 116.935, 548.374 116.276, 549.441 115.468 C 551.911 113.600, 550.287 113.621, 547 115.500 M 449.183 118.058 C 446.809 119.112, 445.121 120.387, 445.432 120.890 C 445.743 121.393, 444.761 122.241, 443.249 122.774 C 439.962 123.933, 435.271 127.598, 436.060 128.391 C 436.663 128.996, 449.878 121.387, 454 118.062 C 457.198 115.481, 454.990 115.480, 449.183 118.058 M 366.892 123.250 C 361.355 127.790, 357.976 132, 359.869 132 C 361.412 132, 374.788 119.074, 373.287 119.033 C 372.621 119.015, 369.743 120.912, 366.892 123.250 M 474 217.500 C 472.555 218.326, 472.133 218.929, 473 218.929 C 473.825 218.929, 475.625 218.286, 477 217.500 C 478.445 216.674, 478.867 216.071, 478 216.071 C 477.175 216.071, 475.375 216.714, 474 217.500" 
                            stroke="none" 
                            fill="currentColor" 
                            fillRule="evenodd"
                        />
                    </svg>
                </div>
            </div>
        </section>
    );
};

const AISection = () => {
    return (
        <section className="bg-[#D7D8CD] pt-20 md:pt-28 pb-0 flex flex-col items-center relative overflow-hidden">
            {/* Top Right Sticky Asset */}
            <img 
                src="/assets/AI section top right sticky svg.svg" 
                alt="" 
                className="absolute right-0 top-0 w-[35%] md:w-[22%] h-auto block select-none pointer-events-none z-0" 
            />

            {/* Headline Container with standard horizontal padding */}
            <div className="w-full px-6 md:px-[10%] relative z-10 flex flex-col items-start">
                {/* Left-Aligned Headline */}
                <h2 className="text-5xl md:text-[5.5rem] font-sans leading-[1.05] tracking-tight text-stone-800 mb-12 md:mb-16">
                    ... and intuitive tools
                </h2>
            </div>

            {/* Full-width Video Card Block */}
            <div className="w-full relative flex justify-center items-center z-10 overflow-hidden">
                <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-auto block select-none pointer-events-none scale-[1.02] origin-center"
                >
                    <source src="/assets/2nd animation AI.webm" type="video/webm" />
                </video>
            </div>
        </section>
    );
};

const FAQSection = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const faqs = [
        {
            question: "Do I need to know music theory to write a song?",
            answer: "No. Many famous songwriters write by ear and emotion. Veinote helps turn your musical ideas into finished songs, with no music degree needed."
        },
        {
            question: "What comes first: the lyrics or the melody?",
            answer: "There is no right way! Some start with a melody, others start with lyrics. Veinote works with both, helping you easily combine words and music."
        },
        {
            question: "My lyrics feel \"cheesy.\" How do I fix them?",
            answer: "Lyrics feel cheesiest when you describe feelings too directly. Veinote helps you show rather than tell, suggesting details and patterns to make your songs feel real."
        },
        {
            question: "How long should it take to write a song?",
            answer: "A song can take 15 minutes or several months. Our tools are built to help you get started right away and finish your songs in hours, not weeks."
        }
    ];

    return (
        <section id="qa" className="bg-[#EFF0E7] py-24 md:py-32 px-6 flex flex-col items-center">
            {/* Centered Large Title */}
            <h2 className="text-4xl md:text-[3.25rem] font-sans tracking-tight text-[#363636] text-center mb-16 md:mb-24">
                Q&A
            </h2>

            {/* Accordion Container */}
            <div className="w-full max-w-3xl flex flex-col">
                {faqs.map((faq, i) => {
                    const isOpen = activeIndex === i;
                    return (
                        <div 
                            key={i} 
                            className="border-b border-stone-200 py-6 md:py-8 cursor-pointer group select-none"
                            onClick={() => setActiveIndex(isOpen ? null : i)}
                        >
                            <div className="flex justify-between items-center gap-6">
                                <span className="text-base md:text-lg text-stone-900 tracking-tight font-medium transition-colors group-hover:text-stone-600">
                                    {faq.question}
                                </span>
                                <Plus 
                                    className={`w-5 h-5 text-stone-950 stroke-[2.5px] transition-transform duration-300 ${
                                        isOpen ? "rotate-45" : "group-hover:scale-110"
                                    }`} 
                                />
                            </div>

                            {/* Collapsible Answer */}
                            <div 
                                className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                                    isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
                                }`}
                            >
                                <div className="overflow-hidden text-sm md:text-base text-stone-600 leading-relaxed font-normal pr-8">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const NewFooter = () => {
    return (
        <footer className="relative w-full h-[80vh] min-h-[550px] md:h-screen md:min-h-[700px] flex flex-col justify-between overflow-hidden bg-[#D3D6CB]">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image 
                    src="/assets/footer_bg_stockholm.png" 
                    alt="" 
                    fill 
                    priority 
                    className="object-cover object-[center_85%]" 
                />
            </div>

            {/* Top Bar Navigation */}
            <div className="relative z-10 w-full px-6 md:px-[10%] pt-8 md:pt-12 flex justify-between items-center">
                {/* Top Left Links */}
                <div className="flex items-center gap-6 text-[15px] text-[#363636] font-medium">
                    <span>Established in 2026</span>
                </div>

                {/* Top Right Links */}
                <div className="flex items-center gap-6 text-[15px] text-[#363636]">
                    <Link href="#qa" className="font-medium hover:text-black transition-colors">Q&A</Link>
                    <Link href="/onboarding" className="font-bold hover:text-black transition-colors">Join now</Link>
                </div>
            </div>

            {/* Center Logo & Copyright Info */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-6 pb-20 md:pb-28">
                {/* Large Serif Logo SVG */}
                <img 
                    src="/assets/Veinote logo TM.svg" 
                    alt="Veinote" 
                    className="w-[280px] sm:w-[350px] md:w-[480px] lg:w-[520px] h-auto block select-none pointer-events-none mb-4 md:mb-6"
                />

                {/* Designed by Humans with Love */}
                <div className="flex items-center gap-2 text-[14px] md:text-[15px] text-[#363636] font-medium tracking-tight bg-white/30 backdrop-blur-lg border border-white/40 px-5 py-2.5 rounded-full shadow-sm">
                    <Heart className="w-4 h-4 fill-[#363636] stroke-none inline shrink-0" />
                    <span>Designed by humans with love, in Stockholm.</span>
                </div>

                {/* Additional footer text */}
                <div className="mt-8 text-xs md:text-[13px] text-[#363636]/80 max-w-md mx-auto space-y-3">
                    <p className="font-normal leading-relaxed">
                        Discover new ideas, build your skills, and become part of a growing community of songwriters.
                    </p>
                    <p className="font-medium text-[#363636] leading-relaxed">
                        Learn. Create. Practice. Connect.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default function HomePage() {
    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen">
            <HeroSection />
            <UrgencySection />
            <YellowBanner />
            <BlobsSection />
            <DarkSection />
            <AISection />
            <FAQSection />
            <NewFooter />
        </div>
    );
}

