document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const connectionStatus = document.getElementById('connectionStatus');
    const connectApiBtn = document.getElementById('connectApi');
    const modelSelect = document.getElementById('modelSelect');
    const modelSearch = document.getElementById('modelSearch');
    const confirmModelBtn = document.getElementById('confirmModel');
    const toneSelect = document.getElementById('toneSelect');
    const targetLanguageSelect = document.getElementById('targetLanguageSelect');
    const creativityLevelSelect = document.getElementById('creativityLevelSelect');
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    const srtFileInput = document.getElementById('srtFile');
    const fileNameDisplay = document.getElementById('fileName');
    const originalSubtitles = document.getElementById('originalSubtitles');
    const translatedSubtitles = document.getElementById('translatedSubtitles');
    const translateBtn = document.getElementById('translateBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resetFileBtn = document.getElementById('resetFileBtn');
    const saveBtn = document.getElementById('saveBtn');
    const themeToggle = document.getElementById('themeToggle');
    const notification = document.getElementById('notification');
    const container = document.querySelector('.container');
    const buttonTexts = document.querySelectorAll('.button-text');
    const progressSection = document.querySelector('.progress-section');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const remainingTime = document.getElementById('remainingTime');
    const originalCounter = document.getElementById('originalCounter');
    const translatedCounter = document.getElementById('translatedCounter');


    // Variables
    let srtContent = [];
    let translatedContent = [];
    let selectedModel = '';
    let apiKey = localStorage.getItem('apiKey') || '';
    let isTranslating = false;
    let isConnected = false;
    let pauseTranslation = false;
    let currentIndex = 0;
    let originalFileName = '';
    let modelsList = []; // برای نگهداری لیست کامل مدل‌ها
    let audioFiles = {}; // Declare audioFiles
    let mergedAudioBlob = null; // Declare mergedAudioBlob
    let lastMergeHash = null; // برای تشخیص تغییرات فایل‌ها
    
    // متغیرهای مربوط به محاسبه پیشرفت و زمان
    let translationStartTime;
    let translationTimes = [];
    let avgTranslationTime = 0;

    // توابع ذخیره و بازیابی داده‌ها
    function saveProjectData() {
        const projectData = {
            srtContent: srtContent,
            translatedContent: translatedContent,
            originalFileName: originalFileName,
            currentIndex: currentIndex,
            isTranslating: isTranslating,
            pauseTranslation: pauseTranslation,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('subtitleProject', JSON.stringify(projectData));
            updateProjectStatus();
        } catch (error) {
            console.error('خطا در ذخیره پروژه:', error);
        }
    }

    function loadProjectData() {
        try {
            const savedData = localStorage.getItem('subtitleProject');
            if (savedData) {
                const projectData = JSON.parse(savedData);
                
                // بررسی اینکه داده‌ها جدید باشند (کمتر از 24 ساعت)
                const dayInMs = 24 * 60 * 60 * 1000;
                if (Date.now() - projectData.timestamp > dayInMs) {
                    localStorage.removeItem('subtitleProject');
                    return false;
                }
                
                // بازیابی داده‌ها
                srtContent = projectData.srtContent || [];
                translatedContent = projectData.translatedContent || [];
                originalFileName = projectData.originalFileName || '';
                currentIndex = projectData.currentIndex || 0;
                
                // نمایش داده‌های بازیابی شده
                if (srtContent.length > 0) {
                    displayOriginalSubtitles();
                    fileNameDisplay.textContent = originalFileName + '.srt';
                }
                
                if (translatedContent.length > 0) {
                    displayTranslatedSubtitles();
                    saveBtn.disabled = false;
                    clearBtn.disabled = false;
                    
                    // اگر ترجمه ناتمام بود، امکان ادامه را فراهم کن
                    if (projectData.isTranslating && projectData.pauseTranslation) {
                        isTranslating = true;
                        pauseTranslation = true;
                        translateBtn.disabled = true;
                        pauseBtn.disabled = true;
                        resumeBtn.disabled = false;
                        
                        // نمایش پیشرفت فعلی
                        const progressPercent = Math.round((currentIndex / srtContent.length) * 100);
                        updateProgress(progressPercent, 0);
                        progressSection.style.display = 'block';
                    }
                }
                
                updateSubtitleCounters();
                updateAudioStatus();
                
                return true;
            }
        } catch (error) {
            console.error('خطا در بازیابی پروژه:', error);
            localStorage.removeItem('subtitleProject');
        }
        return false;
    }

    function clearProjectData() {
        localStorage.removeItem('subtitleProject');
    }

    function displayOriginalSubtitles() {
        originalSubtitles.innerHTML = '';
        srtContent.forEach((entry, index) => { // Added index parameter
            const subtitleItem = document.createElement('div');
            subtitleItem.className = 'subtitle-item';
            subtitleItem.dataset.index = index; // Added data-index attribute
            subtitleItem.innerHTML = `
                <div class="subtitle-time">${entry.timeCode}</div>
                <div class="subtitle-text">${entry.text}</div>
                <div class="subtitle-actions original-actions">
                     <button class="action-btn time-edit-btn" title="ویرایش زمان">
                        <i class="fas fa-clock"></i>
                    </button>
                </div>
            `;
            originalSubtitles.appendChild(subtitleItem);
        });
    }

    function displayTranslatedSubtitles() {
        translatedSubtitles.innerHTML = '';
        
        // ایجاد placeholder برای همه زیرنویس‌ها
        srtContent.forEach((item, index) => {
            addSubtitlePlaceholder(index);
        });
        
        // پر کردن ترجمه‌های موجود
        translatedContent.forEach((translation, index) => {
            const subtitleItem = translatedSubtitles.querySelector(`.subtitle-item[data-index="${index}"]`);
            if (subtitleItem) {
                const subtitleText = subtitleItem.querySelector('.subtitle-text');
                if (subtitleText) {
                    subtitleText.textContent = translation.text;
                    subtitleText.classList.remove('placeholder');
                }
                
                // فعال‌سازی دکمه‌ها
                const editBtn = subtitleItem.querySelector('.edit-btn');
                const retranslateBtn = subtitleItem.querySelector('.retranslate-btn');
                const audioUploadBtn = subtitleItem.querySelector('.audio-upload-btn');
                
                if (editBtn) editBtn.disabled = false;
                if (retranslateBtn) retranslateBtn.disabled = false;
                if (audioUploadBtn) audioUploadBtn.disabled = false;
            }
        });
    }

    function updateProjectStatus() {
        if (!projectStatus || !projectStatusText) return;
        
        const savedData = localStorage.getItem('subtitleProject');
        if (savedData) {
            try {
                const projectData = JSON.parse(savedData);
                const originalCount = projectData.srtContent ? projectData.srtContent.length : 0;
                const translatedCount = projectData.translatedContent ? projectData.translatedContent.length : 0;
                const fileName = projectData.originalFileName || 'نامشخص';
                
                if (originalCount > 0) {
                    const progressPercent = Math.round((translatedCount / originalCount) * 100);
                    projectStatus.classList.remove('no-project');
                    
                    if (translatedCount === originalCount) {
                        projectStatusText.innerHTML = `
                            پروژه کامل: ${fileName}<br>
                            <small>${toPersianNumbers(translatedCount)} از ${toPersianNumbers(originalCount)} زیرنویس ترجمه شده (${toPersianNumbers(progressPercent)}٪)</small>
                        `;
                    } else if (translatedCount > 0) {
                        projectStatusText.innerHTML = `
                            پروژه ناتمام: ${fileName}<br>
                            <small>${toPersianNumbers(translatedCount)} از ${toPersianNumbers(originalCount)} زیرنویس ترجمه شده (${toPersianNumbers(progressPercent)}٪)</small>
                        `;
                    } else {
                        projectStatusText.innerHTML = `
                            پروژه بارگذاری شده: ${fileName}<br>
                            <small>${toPersianNumbers(originalCount)} زیرنویس آماده ترجمه</small>
                        `;
                    }
                } else {
                    projectStatus.classList.add('no-project');
                    projectStatusText.textContent = 'هیچ پروژه ذخیره شده‌ای وجود ندارد';
                }
            } catch (error) {
                projectStatus.classList.add('no-project');
                projectStatusText.textContent = 'خطا در خواندن پروژه ذخیره شده';
            }
        } else {
            projectStatus.classList.add('no-project');
            projectStatusText.textContent = 'هیچ پروژه ذخیره شده‌ای وجود ندارد';
        }
    }

    // DOM Elements (add these if not already present)
    const mergeAudioBtn = document.getElementById('mergeAudioBtn');
    const downloadAudioBtn = document.getElementById('downloadAudioBtn');
    const clearAudioBtn = document.getElementById('clearAudioBtn');
    const audioVolumeSlider = document.getElementById('audioVolumeSlider');
    const audioVolumeValue = document.getElementById('audioVolumeValue');
    const audioQualitySelect = document.getElementById('audioQualitySelect');
    const audioFadeSelect = document.getElementById('audioFadeSelect');
    const audioFormatSelect = document.getElementById('audioFormatSelect');
    const audioOverflowSelect = document.getElementById('audioOverflowSelect');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    const importSettingsBtn = document.getElementById('importSettingsBtn');
    const settingsFileInput = document.getElementById('settingsFileInput');
    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const creativityValue = document.getElementById('creativityValue');
    const clearProjectBtn = document.getElementById('clearProjectBtn');
    const projectStatus = document.getElementById('projectStatus');
    const projectStatusText = document.getElementById('projectStatusText');
    const audioProgressBar = document.getElementById('audioProgressBar');
    const audioProgressPercentage = document.getElementById('audioProgressPercentage');
    const audioStatus = document.getElementById('audioStatus');
    
    // متغیرهای مربوط به ویرایشگر صوتی
    const audioEditorModal = document.getElementById('audioEditorModal');
    const closeAudioEditorBtn = document.getElementById('closeAudioEditorBtn');
    const audioWaveform = document.getElementById('audioWaveform');
    const audioTrimStart = document.getElementById('audioTrimStart');
    const audioTrimEnd = document.getElementById('audioTrimEnd');
    const audioPlaybackRate = document.getElementById('audioPlaybackRate');
    const audioTrimStartValue = document.getElementById('audioTrimStartValue');
    const audioTrimEndValue = document.getElementById('audioTrimEndValue');
    const audioPlaybackRateDisplay = document.getElementById('audioPlaybackRateValue');
    const audioStartTime = document.getElementById('audioStartTime');
    const audioEndTime = document.getElementById('audioEndTime');
    const audioDuration = document.getElementById('audioDuration');
    const audioPlayPauseBtn = document.getElementById('audioPlayPauseBtn');
    const audioResetBtn = document.getElementById('audioResetBtn');
    const audioApplyBtn = document.getElementById('audioApplyBtn');
    const subtitleTimeDisplay = document.getElementById('subtitleTimeDisplay');
    const subtitleDurationDisplay = document.getElementById('subtitleDurationDisplay');

    // تابع بروزرسانی پیشرفت صوتی
    function updateAudioProgress(progress) {
        if (audioProgressBar && audioProgressPercentage) {
            audioProgressBar.style.width = `${progress}%`;
            audioProgressPercentage.textContent = `${toPersianNumbers(Math.round(progress))}٪`;
        }
    }

    // تابع محاسبه hash فایل‌های صوتی برای تشخیص تغییرات
    function calculateAudioFilesHash() {
        const fileKeys = Object.keys(audioFiles).sort();
        const hashData = fileKeys.map(key => {
            const file = audioFiles[key];
            return `${key}:${file.name}:${file.size}:${file.lastModified}`;
        }).join('|');
        
        // ساده‌ترین hash function
        let hash = 0;
        for (let i = 0; i < hashData.length; i++) {
            const char = hashData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // تبدیل به 32bit integer
        }
        return hash.toString();
    }

    // تابع بررسی تغییرات فایل‌ها
    function checkAudioFilesChanged() {
        const currentHash = calculateAudioFilesHash();
        return lastMergeHash !== null && lastMergeHash !== currentHash;
    }

    // تابع بروزرسانی وضعیت دوبله
    function updateAudioStatus() {
        if (!audioStatus) return;
        
        const audioFileCount = Object.keys(audioFiles).length;
        const totalSubtitles = srtContent.length;
        const filesChanged = checkAudioFilesChanged();
        
        if (audioFileCount === 0) {
            audioStatus.textContent = 'وضعیت دوبله: بدون فایل صوتی';
            mergeAudioBtn.disabled = true;
        } else if (mergedAudioBlob && !filesChanged) {
            // محاسبه اطلاعات فایل ترکیب شده
            const fileSizeKB = Math.round(mergedAudioBlob.size / 1024);
            let totalDuration = 0;
            if (srtContent.length > 0) {
                const lastSubtitle = srtContent[srtContent.length - 1];
                const timeParts = lastSubtitle.timeCode.split(' --> ');
                if (timeParts.length === 2) {
                    totalDuration = parseTimeToSeconds(timeParts[1]) + 2;
                }
            }
            const durationMinutes = Math.floor(totalDuration / 60);
            const durationSeconds = Math.round(totalDuration % 60);
            const selectedFormat = audioFormatSelect.value;
            const formatText = selectedFormat === 'mp3' ? 'MP3' : 'WAV';
            
            audioStatus.innerHTML = `
                وضعیت دوبله: آماده دانلود (${formatText})<br>
                <small>مدت زمان: ${toPersianNumbers(durationMinutes)}:${toPersianNumbers(durationSeconds.toString().padStart(2, '0'))} | حجم: ${toPersianNumbers(fileSizeKB)} KB</small>
            `;
            mergeAudioBtn.disabled = true;
        } else {
            if (filesChanged && mergedAudioBlob) {
                audioStatus.innerHTML = `
                    وضعیت دوبله: ${toPersianNumbers(audioFileCount)} فایل صوتی (تغییر یافته)<br>
                    <small>فایل‌ها تغییر کرده‌اند. برای دانلود مجدداً ترکیب کنید.</small>
                `;
                downloadAudioBtn.disabled = true;
            } else {
                audioStatus.innerHTML = `
                    وضعیت دوبله: ${toPersianNumbers(audioFileCount)} فایل صوتی آماده ترکیب<br>
                    <small>از ${toPersianNumbers(totalSubtitles)} زیرنویس</small>
                `;
            }
            mergeAudioBtn.disabled = false;
        }
    }








    
    // بهینه‌سازی اندازه صفحه در زمان لود
    adjustUIForScreenSize();
    window.addEventListener('resize', adjustUIForScreenSize);
    window.addEventListener('orientationchange', adjustUIForScreenSize);
    
    // بازیابی پروژه قبلی در صورت وجود
    const projectLoaded = loadProjectData();
    if (projectLoaded) {
        showNotification('پروژه قبلی بازیابی شد');
    }
    
    // بروزرسانی وضعیت پروژه در تنظیمات
    updateProjectStatus();
    
    // Set saved API key if available
    if (apiKey) {
        apiKeyInput.value = apiKey;
        testApiConnection(apiKey);
    }
    
    // تنظیم وضعیت اولیه دکمه تنظیمات
    updateSettingsButtonStatus();
    
    // بازیابی مدل ذخیره شده از localStorage برای نمایش در رابط کاربری
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
        selectedModel = savedModel;
    }

    // Set theme based on local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Event Listeners
    connectApiBtn.addEventListener('click', connectApi);
    confirmModelBtn.addEventListener('click', confirmModel);
    srtFileInput.addEventListener('change', handleFileUpload);
    translateBtn.addEventListener('click', startTranslation);
    pauseBtn.addEventListener('click', pauseTranslationProcess);
    resumeBtn.addEventListener('click', resumeTranslationProcess);
    clearBtn.addEventListener('click', clearTranslationProcess);
    resetFileBtn.addEventListener('click', resetFile);
    saveBtn.addEventListener('click', saveTranslatedSubtitles);
    themeToggle.addEventListener('click', toggleTheme);
    modelSearch.addEventListener('input', filterModels);
    mergeAudioBtn.addEventListener('click', mergeAudioFiles);
    downloadAudioBtn.addEventListener('click', downloadMergedAudio);
    clearAudioBtn.addEventListener('click', clearAllAudioFiles);
    settingsToggleBtn.addEventListener('click', openSettingsModal);
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // تنظیمات صوتی
    audioVolumeSlider.addEventListener('input', (e) => {
        audioVolumeValue.textContent = `${e.target.value}%`;
    });
    
    // ذخیره تنظیمات در localStorage
    audioVolumeSlider.addEventListener('change', () => {
        localStorage.setItem('audioVolume', audioVolumeSlider.value);
    });
    
    audioQualitySelect.addEventListener('change', () => {
        localStorage.setItem('audioQuality', audioQualitySelect.value);
    });
    
    audioFadeSelect.addEventListener('change', () => {
        localStorage.setItem('audioFade', audioFadeSelect.value);
    });
    
    audioFormatSelect.addEventListener('change', () => {
        localStorage.setItem('audioFormat', audioFormatSelect.value);
        // اگر فایل ترکیب شده وجود دارد، آن را پاک کن تا مجبور به ترکیب مجدد شود
        if (mergedAudioBlob) {
            mergedAudioBlob = null;
            downloadAudioBtn.disabled = true;
            updateAudioStatus();
            showNotification('فرمت تغییر کرد. لطفاً مجدداً فایل‌ها را ترکیب کنید.');
        }
    });
    
    audioOverflowSelect.addEventListener('change', () => {
        localStorage.setItem('audioOverflow', audioOverflowSelect.value);
        // اگر فایل ترکیب شده وجود دارد، آن را پاک کن تا مجبور به ترکیب مجدد شود
        if (mergedAudioBlob) {
            mergedAudioBlob = null;
            downloadAudioBtn.disabled = true;
            updateAudioStatus();
            showNotification('تنظیمات تغییر کرد. لطفاً مجدداً فایل‌ها را ترکیب کنید.');
        }
    });
    
    // بازیابی تنظیمات ذخیره شده
    const savedVolume = localStorage.getItem('audioVolume');
    if (savedVolume) {
        audioVolumeSlider.value = savedVolume;
        audioVolumeValue.textContent = `${savedVolume}%`;
    }
    
    const savedQuality = localStorage.getItem('audioQuality');
    if (savedQuality) {
        audioQualitySelect.value = savedQuality;
    }
    
    const savedFade = localStorage.getItem('audioFade');
    if (savedFade) {
        audioFadeSelect.value = savedFade;
    }
    
    const savedFormat = localStorage.getItem('audioFormat');
    if (savedFormat) {
        audioFormatSelect.value = savedFormat;
    }
    
    const savedOverflow = localStorage.getItem('audioOverflow');
    if (savedOverflow) {
        audioOverflowSelect.value = savedOverflow;
    }

    // بازیابی تنظیمات ترجمه
    const savedTone = localStorage.getItem('translationTone');
    if (savedTone) {
        toneSelect.value = savedTone;
    }

    const savedLanguage = localStorage.getItem('targetLanguage');
    if (savedLanguage) {
        targetLanguageSelect.value = savedLanguage;
    }

    const savedCreativity = localStorage.getItem('creativityLevel');
    if (savedCreativity) {
        creativityLevelSelect.value = savedCreativity;
        creativityValue.textContent = savedCreativity;
    }

    // نمایش پیام بازیابی تنظیمات در صورت وجود
    const hasSettings = savedTone || savedLanguage || savedCreativity || 
                       localStorage.getItem('audioVolume') || 
                       localStorage.getItem('selectedModel');
    
    if (hasSettings) {
        setTimeout(() => {
            showNotification('تنظیمات ذخیره شده بازیابی شدند');
        }, 1000);
    }

    // Event listeners برای ذخیره تنظیمات ترجمه
    toneSelect.addEventListener('change', () => {
        localStorage.setItem('translationTone', toneSelect.value);
        showNotification('لحن ترجمه ذخیره شد');
    });

    targetLanguageSelect.addEventListener('change', () => {
        localStorage.setItem('targetLanguage', targetLanguageSelect.value);
        showNotification('زبان خروجی ذخیره شد');
    });

    creativityLevelSelect.addEventListener('input', () => {
        creativityValue.textContent = creativityLevelSelect.value;
        localStorage.setItem('creativityLevel', creativityLevelSelect.value);
    });

    creativityLevelSelect.addEventListener('change', () => {
        showNotification('میزان خلاقیت ذخیره شد');
    });

    // دکمه بازنشانی تنظیمات
    resetSettingsBtn.addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید که می‌خواهید همه تنظیمات را به حالت پیش‌فرض بازگردانید؟')) {
            // پاک کردن تنظیمات ترجمه
            localStorage.removeItem('translationTone');
            localStorage.removeItem('targetLanguage');
            localStorage.removeItem('creativityLevel');
            
            // پاک کردن تنظیمات صوتی
            localStorage.removeItem('audioVolume');
            localStorage.removeItem('audioQuality');
            localStorage.removeItem('audioFade');
            localStorage.removeItem('audioFormat');
            localStorage.removeItem('audioOverflow');
            
            // پاک کردن سایر تنظیمات
            localStorage.removeItem('selectedModel');
            localStorage.removeItem('theme');
            
            // بازنشانی مقادیر به حالت پیش‌فرض
            toneSelect.value = 'normal';
            targetLanguageSelect.value = 'fa';
            creativityLevelSelect.value = '0.5';
            creativityValue.textContent = '0.5';
            audioVolumeSlider.value = '80';
            audioVolumeValue.textContent = '80%';
            audioQualitySelect.value = '44100';
            audioFadeSelect.value = '0.3';
            audioFormatSelect.value = 'mp3';
            audioOverflowSelect.value = 'extend';
            
            // بازنشانی تم به حالت روشن
            document.body.classList.remove('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            
            showNotification('همه تنظیمات به حالت پیش‌فرض بازگردانده شدند');
        }
    });

    // صادرات تنظیمات
    exportSettingsBtn.addEventListener('click', () => {
        const settings = {
            translationTone: localStorage.getItem('translationTone'),
            targetLanguage: localStorage.getItem('targetLanguage'),
            creativityLevel: localStorage.getItem('creativityLevel'),
            audioVolume: localStorage.getItem('audioVolume'),
            audioQuality: localStorage.getItem('audioQuality'),
            audioFade: localStorage.getItem('audioFade'),
            audioFormat: localStorage.getItem('audioFormat'),
            audioOverflow: localStorage.getItem('audioOverflow'),
            selectedModel: localStorage.getItem('selectedModel'),
            theme: localStorage.getItem('theme'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `subtitle-translator-settings-${new Date().toISOString().slice(0, 10)}.json`;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(downloadLink.href);
        showNotification('تنظیمات با موفقیت صادر شدند');
    });

    // وارد کردن تنظیمات
    importSettingsBtn.addEventListener('click', () => {
        settingsFileInput.click();
    });

    settingsFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const settings = JSON.parse(event.target.result);
                
                // اعتبارسنجی فایل
                if (!settings.version) {
                    throw new Error('فایل تنظیمات نامعتبر است');
                }

                // وارد کردن تنظیمات
                if (settings.translationTone) {
                    localStorage.setItem('translationTone', settings.translationTone);
                    toneSelect.value = settings.translationTone;
                }
                
                if (settings.targetLanguage) {
                    localStorage.setItem('targetLanguage', settings.targetLanguage);
                    targetLanguageSelect.value = settings.targetLanguage;
                }
                
                if (settings.creativityLevel) {
                    localStorage.setItem('creativityLevel', settings.creativityLevel);
                    creativityLevelSelect.value = settings.creativityLevel;
                    creativityValue.textContent = settings.creativityLevel;
                }
                
                if (settings.audioVolume) {
                    localStorage.setItem('audioVolume', settings.audioVolume);
                    audioVolumeSlider.value = settings.audioVolume;
                    audioVolumeValue.textContent = `${settings.audioVolume}%`;
                }
                
                if (settings.audioQuality) {
                    localStorage.setItem('audioQuality', settings.audioQuality);
                    audioQualitySelect.value = settings.audioQuality;
                }
                
                if (settings.audioFade) {
                    localStorage.setItem('audioFade', settings.audioFade);
                    audioFadeSelect.value = settings.audioFade;
                }
                
                if (settings.audioFormat) {
                    localStorage.setItem('audioFormat', settings.audioFormat);
                    audioFormatSelect.value = settings.audioFormat;
                }
                
                if (settings.audioOverflow) {
                    localStorage.setItem('audioOverflow', settings.audioOverflow);
                    audioOverflowSelect.value = settings.audioOverflow;
                }
                
                if (settings.selectedModel) {
                    localStorage.setItem('selectedModel', settings.selectedModel);
                    selectedModel = settings.selectedModel;
                }
                
                if (settings.theme) {
                    localStorage.setItem('theme', settings.theme);
                    if (settings.theme === 'dark') {
                        document.body.classList.add('dark-mode');
                        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                    } else {
                        document.body.classList.remove('dark-mode');
                        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                    }
                }

                showNotification('تنظیمات با موفقیت وارد شدند');
                
            } catch (error) {
                console.error('خطا در وارد کردن تنظیمات:', error);
                showNotification('خطا در وارد کردن فایل تنظیمات. لطفاً فایل معتبر انتخاب کنید.');
            }
        };
        
        reader.readAsText(file);
        settingsFileInput.value = ''; // پاک کردن انتخاب فایل
    });

    // دکمه پاک کردن پروژه ذخیره شده
    clearProjectBtn.addEventListener('click', () => {
        const savedData = localStorage.getItem('subtitleProject');
        if (!savedData) {
            showNotification('هیچ پروژه ذخیره شده‌ای وجود ندارد');
            return;
        }

        if (confirm('آیا مطمئن هستید که می‌خواهید پروژه ذخیره شده را پاک کنید؟ این عمل غیرقابل بازگشت است.')) {
            clearProjectData();
            updateProjectStatus();
            showNotification('پروژه ذخیره شده پاک شد');
        }
    });

    // توابع مدیریت مودال تنظیمات
    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Force reflow برای اطمینان از اعمال display
            settingsModal.offsetHeight;
            
            settingsModal.classList.add('show');
            updateSettingsButtonStatus();
        }
    }

    // بروزرسانی وضعیت دکمه تنظیمات
    function updateSettingsButtonStatus() {
        const settingsIcon = settingsToggleBtn.querySelector('i');
        if (isConnected) {
            settingsIcon.className = 'fas fa-cog';
            settingsToggleBtn.style.background = 'linear-gradient(135deg, var(--success-color), var(--primary-color))';
        } else {
            settingsIcon.className = 'fas fa-exclamation-triangle';
            settingsToggleBtn.style.background = 'linear-gradient(135deg, var(--warning-color), var(--danger-color))';
        }
    }

    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.classList.remove('show');
            document.body.style.overflow = '';
            
            // مخفی کردن مودال پس از اتمام انیمیشن
            setTimeout(() => {
                if (!settingsModal.classList.contains('show')) {
                    settingsModal.style.display = 'none';
                }
            }, 200);
        }
    }

    // بستن مودال با کلید Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal.classList.contains('show')) {
            closeSettingsModal();
        }
    });

    // ذخیره خودکار هنگام بسته شدن صفحه
    window.addEventListener('beforeunload', () => {
        if (srtContent.length > 0 || translatedContent.length > 0) {
            saveProjectData();
        }
    });

    // ذخیره خودکار هر 30 ثانیه در صورت وجود تغییرات
    setInterval(() => {
        if (srtContent.length > 0 || translatedContent.length > 0) {
            saveProjectData();
        }
    }, 30000);
    
    // Event delegation for edit and retranslate buttons
    translatedSubtitles.addEventListener('click', function(e) {
        const target = e.target;
        const subtitleItem = target.closest('.subtitle-item');
        if (!subtitleItem) return;
        
        const subtitleIndex = parseInt(subtitleItem.dataset.index);

        // Handle text edit button clicks
        if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
            const subtitleText = subtitleItem.querySelector('.subtitle-text');
            toggleEdit(subtitleText, subtitleIndex);
        }
        
        // Handle retranslate button clicks
        if (target.classList.contains('retranslate-btn') || target.closest('.retranslate-btn')) {
            retranslateSubtitle(subtitleIndex);
        }
        
        // Handle time edit button clicks
        if (target.classList.contains('time-edit-btn') || target.closest('.time-edit-btn')) {
            toggleTimeEdit(subtitleItem, subtitleIndex);
        }
    });

    async function mergeAudioFiles() {
        try {
        showNotification('در حال ترکیب فایل‌های صوتی...');
        mergeAudioBtn.disabled = true;
        downloadAudioBtn.disabled = true;
        audioStatus.textContent = 'وضعیت دوبله: در حال ترکیب...';
        updateAudioProgress(0);
        
            // بررسی وجود فایل‌های صوتی
            const audioFileKeys = Object.keys(audioFiles);
            if (audioFileKeys.length === 0) {
                showNotification('هیچ فایل صوتی برای ترکیب وجود ندارد.');
                mergeAudioBtn.disabled = false;
                return;
            }

            // ایجاد AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // محاسبه مدت زمان کل زیرنویس‌ها با در نظر گیری فایل‌های صوتی طولانی‌تر
            let totalDuration = 0;
            const durationOverflowMode = audioOverflowSelect.value || 'extend';
            
            if (srtContent.length > 0) {
                // محاسبه زمان پایان بر اساس آخرین زیرنویس
                const lastSubtitle = srtContent[srtContent.length - 1];
                const timeParts = lastSubtitle.timeCode.split(' --> ');
                if (timeParts.length === 2) {
                    totalDuration = parseTimeToSeconds(timeParts[1]) + 2;
                }
                
                // اگر حالت تمدید فعال است، بررسی فایل‌های صوتی طولانی‌تر
                if (durationOverflowMode === 'extend') {
                    Object.keys(audioFiles).forEach(indexStr => {
                        const index = parseInt(indexStr);
                        const subtitle = srtContent[index];
                        if (subtitle) {
                            const timeParts = subtitle.timeCode.split(' --> ');
                            if (timeParts.length === 2) {
                                const startTime = parseTimeToSeconds(timeParts[0]);
                                const audioFile = audioFiles[index];
                                
                                // تخمین مدت زمان فایل صوتی (از localStorage یا محاسبه مجدد)
                                // برای سادگی، فرض می‌کنیم حداکثر 30 ثانیه اضافه
                                const estimatedAudioEnd = startTime + 30;
                                if (estimatedAudioEnd > totalDuration) {
                                    totalDuration = estimatedAudioEnd;
                                }
                            }
                        }
                    });
                }
            }

            // ایجاد AudioBuffer برای فایل نهایی با تنظیمات کاربر
            const sampleRate = parseInt(audioQualitySelect.value) || 44100;
            const channels = 2; // استریو
            const frameCount = Math.ceil(totalDuration * sampleRate);
            const finalBuffer = audioContext.createBuffer(channels, frameCount, sampleRate);
            
            // دریافت تنظیمات کاربر
            const volumeMultiplier = (parseInt(audioVolumeSlider.value) || 80) / 100;
            const fadeTime = parseFloat(audioFadeSelect.value) || 0.3;
            const overflowMode = audioOverflowSelect.value || 'extend';
            
            // پاک کردن بافر (سکوت کامل)
            for (let channel = 0; channel < channels; channel++) {
                const channelData = finalBuffer.getChannelData(channel);
                for (let i = 0; i < frameCount; i++) {
                    channelData[i] = 0;
                }
            }

            let processedFiles = 0;
            const totalFiles = audioFileKeys.length;

            // پردازش هر فایل صوتی
            for (const indexStr of audioFileKeys) {
                const index = parseInt(indexStr);
                const audioFile = audioFiles[index];
                const subtitle = srtContent[index];

                if (!subtitle) continue;

                try {
                    // خواندن فایل صوتی
                    const arrayBuffer = await audioFile.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // استخراج زمان شروع و پایان از timeCode
                    const timeParts = subtitle.timeCode.split(' --> ');
                    if (timeParts.length !== 2) continue;
                    
                    const startTime = parseTimeToSeconds(timeParts[0]);
                    const endTime = parseTimeToSeconds(timeParts[1]);
                    const subtitleDuration = endTime - startTime;
                    const audioDuration = audioBuffer.duration;

                    // محاسبه موقعیت در فایل نهایی
                    const startFrame = Math.floor(startTime * sampleRate);
                    
                    let actualDuration = subtitleDuration;
                    let playbackRate = 1.0;
                    let sourceFrames = audioBuffer.length;
                    
                    // مدیریت فایل‌های طولانی‌تر بر اساس تنظیمات کاربر
                    if (audioDuration > subtitleDuration + 0.1) {
                        switch (overflowMode) {
                            case 'extend':
                                // تمدید زمان زیرنویس تا انتهای فایل صوتی
                                actualDuration = audioDuration;
                                break;
                            case 'cut':
                                // برش فایل صوتی به اندازه زمان زیرنویس
                                sourceFrames = Math.floor(subtitleDuration * audioBuffer.sampleRate);
                                break;
                            case 'speed':
                                // تنظیم سرعت پخش برای جا شدن در زمان زیرنویس
                                playbackRate = audioDuration / subtitleDuration;
                                break;
                        }
                    }
                    
                    const maxFrames = Math.min(
                        sourceFrames,
                        Math.floor(actualDuration * sampleRate),
                        frameCount - startFrame
                    );

                    // کپی کردن داده‌های صوتی
                    for (let channel = 0; channel < Math.min(channels, audioBuffer.numberOfChannels); channel++) {
                        const sourceData = audioBuffer.getChannelData(channel);
                        const targetData = finalBuffer.getChannelData(channel);

                        for (let i = 0; i < maxFrames; i++) {
                            if (startFrame + i < frameCount) {
                                // محاسبه موقعیت در فایل مبدأ با در نظر گیری سرعت پخش
                                let sourceIndex = Math.floor(i * playbackRate);
                                
                                if (sourceIndex < sourceData.length) {
                                    // اعمال fade in/out و تنظیمات حجم
                                    let sample = sourceData[sourceIndex];
                                    
                                    // Fade in
                                    if (fadeTime > 0 && i < sampleRate * fadeTime) {
                                        sample *= i / (sampleRate * fadeTime);
                                    }
                                    
                                    // Fade out
                                    if (fadeTime > 0 && i > maxFrames - sampleRate * fadeTime) {
                                        sample *= (maxFrames - i) / (sampleRate * fadeTime);
                                    }

                                    // اعمال حجم صدا و جلوگیری از clipping
                                    targetData[startFrame + i] += sample * volumeMultiplier * 0.9;
                                }
                            }
                        }
                    }

                    processedFiles++;
                    updateAudioProgress((processedFiles / totalFiles) * 90); // 90% برای پردازش فایل‌ها

                } catch (error) {
                    console.error(`خطا در پردازش فایل صوتی ${index}:`, error);
                    showNotification(`خطا در پردازش فایل صوتی ${index + 1}`);
                }
            }

            // تبدیل AudioBuffer به فرمت انتخابی
            updateAudioProgress(95);
            audioStatus.textContent = 'وضعیت دوبله: در حال تولید فایل نهایی...';
            
            const selectedFormat = audioFormatSelect.value;
            let audioBlob;
            
            if (selectedFormat === 'mp3') {
                audioBlob = audioBufferToMp3(finalBuffer);
            } else {
                audioBlob = audioBufferToWav(finalBuffer);
            }
            
            mergedAudioBlob = audioBlob;

                        updateAudioProgress(100);
                downloadAudioBtn.disabled = false;
            
            // ذخیره hash فایل‌های فعلی
            lastMergeHash = calculateAudioFilesHash();
            
            // بروزرسانی وضعیت دوبله
            updateAudioStatus();
            
            // محاسبه اطلاعات برای نمایش پیام
            const fileSizeKB = Math.round(mergedAudioBlob.size / 1024);
            showNotification(`فایل‌های صوتی با موفقیت ترکیب شدند! (${totalFiles} فایل، ${fileSizeKB} KB)`);

        } catch (error) {
            console.error('خطا در ترکیب فایل‌های صوتی:', error);
            showNotification('خطا در ترکیب فایل‌های صوتی. لطفاً مجدداً تلاش کنید.');
            mergeAudioBtn.disabled = false;
            audioStatus.textContent = 'وضعیت دوبله: خطا در ترکیب';
            updateAudioProgress(0);
        }
    }

    // تابع کمکی برای تبدیل زمان به ثانیه (پشتیبانی از SRT و VTT)
    function parseTimeToSeconds(timeString) {
        const parts = timeString.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        
        // پشتیبانی از هر دو فرمت: SRT (,) و VTT (.)
        const secondsParts = parts[2].split(/[,\.]/);
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = parseInt(secondsParts[1]) || 0;
        
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    // تابع تبدیل AudioBuffer به MP3 (شبیه‌سازی فشرده‌سازی)
    function audioBufferToMp3(buffer) {
        // برای MP3 واقعی نیاز به کتابخانه‌ای مثل lamejs داریم
        // اما برای سادگی، فایل WAV با کیفیت کمتر تولید می‌کنیم
        const length = buffer.length;
        const numberOfChannels = Math.min(buffer.numberOfChannels, 2); // حداکثر استریو
        const sampleRate = Math.min(buffer.sampleRate, 22050); // کاهش sample rate برای فشرده‌سازی
        const downsampleRatio = buffer.sampleRate / sampleRate;
        const newLength = Math.floor(length / downsampleRatio);
        
        const arrayBuffer = new ArrayBuffer(44 + newLength * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);

        // WAV header با sample rate کمتر
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const writeUint32 = (offset, value) => {
            view.setUint32(offset, value, true);
        };

        const writeUint16 = (offset, value) => {
            view.setUint16(offset, value, true);
        };

        // RIFF chunk descriptor
        writeString(0, 'RIFF');
        writeUint32(4, 36 + newLength * numberOfChannels * 2);
        writeString(8, 'WAVE');

        // FMT sub-chunk
        writeString(12, 'fmt ');
        writeUint32(16, 16);
        writeUint16(20, 1); // PCM
        writeUint16(22, numberOfChannels);
        writeUint32(24, sampleRate);
        writeUint32(28, sampleRate * numberOfChannels * 2);
        writeUint16(32, numberOfChannels * 2);
        writeUint16(34, 16);

        // Data sub-chunk
        writeString(36, 'data');
        writeUint32(40, newLength * numberOfChannels * 2);

        // Write downsampled audio data
        let offset = 44;
        for (let i = 0; i < newLength; i++) {
            const sourceIndex = Math.floor(i * downsampleRatio);
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const channelData = buffer.getChannelData(channel);
                const sample = sourceIndex < channelData.length ? channelData[sourceIndex] : 0;
                const clampedSample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, clampedSample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    // تابع تبدیل AudioBuffer به WAV
    function audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        const writeUint32 = (offset, value) => {
            view.setUint32(offset, value, true);
        };

        const writeUint16 = (offset, value) => {
            view.setUint16(offset, value, true);
        };

        // RIFF chunk descriptor
        writeString(0, 'RIFF');
        writeUint32(4, 36 + length * numberOfChannels * 2);
        writeString(8, 'WAVE');

        // FMT sub-chunk
        writeString(12, 'fmt ');
        writeUint32(16, 16);
        writeUint16(20, 1); // PCM
        writeUint16(22, numberOfChannels);
        writeUint32(24, sampleRate);
        writeUint32(28, sampleRate * numberOfChannels * 2);
        writeUint16(32, numberOfChannels * 2);
        writeUint16(34, 16);

        // Data sub-chunk
        writeString(36, 'data');
        writeUint32(40, length * numberOfChannels * 2);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    // تابع پاک کردن همه فایل‌های صوتی
    function clearAllAudioFiles() {
        if (Object.keys(audioFiles).length === 0) {
            showNotification('هیچ فایل صوتی برای پاک کردن وجود ندارد.');
            return;
        }

        if (confirm('آیا مطمئن هستید که می‌خواهید همه فایل‌های صوتی را پاک کنید؟')) {
            // پاک کردن همه فایل‌های صوتی
            audioFiles = {};
            
            // بروزرسانی رابط کاربری
            document.querySelectorAll('.subtitle-item').forEach(item => {
                item.classList.remove('has-audio');
                const audioStatus = item.querySelector('.audio-status');
                if (audioStatus) {
                    audioStatus.textContent = 'فایل صوتی: بدون صدا';
                }
                
                // حذف دکمه‌های پیش‌نمایش و حذف
                const previewBtn = item.querySelector('.audio-preview-btn');
                const removeBtn = item.querySelector('.audio-remove-btn');
                if (previewBtn) previewBtn.remove();
                if (removeBtn) removeBtn.remove();
            });
            
            // غیرفعال کردن دکمه ترکیب
            mergeAudioBtn.disabled = true;
            downloadAudioBtn.disabled = true;
            
            // پاک کردن فایل ترکیب شده و hash
            mergedAudioBlob = null;
            lastMergeHash = null;
            
                // بازنشانی نوار پیشرفت و وضعیت
    updateAudioProgress(0);
    updateAudioStatus();
            
            showNotification('همه فایل‌های صوتی پاک شدند.');
        }
    }

    function downloadMergedAudio() {
        if (!mergedAudioBlob) {
            showNotification('فایل صوتی ترکیبی وجود ندارد.');
            return;
        }

        try {
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(mergedAudioBlob);
            
            // تولید نام فایل با تاریخ و زمان
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const selectedFormat = audioFormatSelect.value;
            const extension = selectedFormat === 'mp3' ? 'mp3' : 'wav';
            const fileName = originalFileName ? 
                `${originalFileName}_dubbed_${timestamp}.${extension}` : 
                `dubbed_audio_${timestamp}.${extension}`;
            
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
            // آزاد کردن حافظه
            setTimeout(() => {
                URL.revokeObjectURL(downloadLink.href);
            }, 1000);
            
            showNotification(`فایل دوبله صوتی "${fileName}" با موفقیت دانلود شد.`);
            
        } catch (error) {
            console.error('خطا در دانلود فایل صوتی:', error);
            showNotification('خطا در دانلود فایل صوتی. لطفاً مجدداً تلاش کنید.');
        }
    }
    
    // تنظیم سایز و نمایش المان‌ها بر اساس اندازه صفحه
    function adjustUIForScreenSize() {
        const isMobile = window.innerWidth <= 480;
        const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // تنظیم ارتفاع کانتینرهای زیرنویس
        const subtitleContainers = document.querySelectorAll('.subtitle-container');
        
        if (isLandscape && (isMobile || isTablet)) {
            subtitleContainers.forEach(container => {
                container.style.height = '180px';
                container.style.maxHeight = '180px';
                container.style.minHeight = '150px';
            });
        } else if (isMobile) {
            subtitleContainers.forEach(container => {
                container.style.height = '250px';
                container.style.maxHeight = '250px';
                container.style.minHeight = '200px';
            });
        } else if (isTablet) {
            subtitleContainers.forEach(container => {
                container.style.height = '300px';
                container.style.maxHeight = '300px';
                container.style.minHeight = '250px';
            });
        } else {
            // دسکتاپ
            subtitleContainers.forEach(container => {
                container.style.height = '400px';
                container.style.maxHeight = '400px';
                container.style.minHeight = '300px';
            });
        }
        
        // تضمین حالت اسکرول برای کانتینرهای زیرنویس
        subtitleContainers.forEach(container => {
            container.style.overflowY = 'auto';
        });
        
        // بهینه‌سازی‌های بیشتر بر اساس نیاز
        if (isMobile && !isLandscape) {
            // برای گوشی‌های موبایل در حالت عمودی
            document.querySelectorAll('.subtitle-actions').forEach(actions => {
                actions.style.position = 'static';
                actions.style.opacity = '1';
                actions.style.marginTop = '10px';
            });
        } else {
            // برای سایر حالت‌ها
            document.querySelectorAll('.subtitle-actions').forEach(actions => {
                actions.style.position = '';
                actions.style.opacity = '';
                actions.style.marginTop = '';
            });
        }
    }

    // Functions
    function connectApi() {
        const apiKeyValue = apiKeyInput.value.trim();
        if (!apiKeyValue) {
            showNotification('لطفاً کلید API را وارد کنید');
            return;
        }

        // Save API key to localStorage
        localStorage.setItem('apiKey', apiKeyValue);
        apiKey = apiKeyValue;
        
        // Test connection
        testApiConnection(apiKeyValue);
    }

    async function testApiConnection(apiKeyValue) {
        showNotification('در حال بررسی اتصال API...');
        connectionStatus.className = 'connection-status';
        
        try {
            // تنها OpenRouter API بررسی می‌شود
            const openRouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKeyValue}`,
                    'HTTP-Referer': window.location.href,
                    'Content-Type': 'application/json'
                }
            });
            
            if (openRouterResponse.ok) {
                const data = await openRouterResponse.json();
                populateModels(data.data, 'openrouter');
                connectionStatus.classList.add('connected');
                isConnected = true;
                updateSettingsButtonStatus();
                showNotification('اتصال API موفقیت‌آمیز بود');
                return;
            }
            
            // اگر اتصال موفق نبود
            connectionStatus.classList.add('disconnected');
            isConnected = false;
            updateSettingsButtonStatus();
            showNotification('اتصال API ناموفق بود. لطفاً کلید API معتبر OpenRouter وارد کنید');
            
        } catch (error) {
            console.error('API connection error:', error);
            connectionStatus.classList.add('disconnected');
            isConnected = false;
            updateSettingsButtonStatus();
            showNotification('خطا در اتصال به API');
        }
    }

    function populateModels(models, provider) {
        modelSelect.innerHTML = '';
        modelsList = []; // پاک کردن لیست قبلی
        
        // فقط مدل‌های OpenRouter پشتیبانی می‌شوند
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name || model.id;
            option.dataset.provider = 'openrouter';
            modelSelect.appendChild(option);
            
            // اضافه کردن به لیست کامل مدل‌ها
            modelsList.push({
                value: model.id,
                text: model.name || model.id,
                provider: 'openrouter'
            });
        });
        
        // بازیابی مدل ذخیره شده قبلی
        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            // بررسی آیا مدل قبلی در لیست فعلی وجود دارد
            for (let i = 0; i < modelSelect.options.length; i++) {
                if (modelSelect.options[i].value === savedModel) {
                    modelSelect.selectedIndex = i;
                    selectedModel = savedModel; // تنظیم مدل انتخاب شده
                    break;
                }
            }
        }
        
        // فعال کردن فیلد جستجو
        modelSearch.disabled = false;
    }
    
    // فیلتر کردن مدل‌ها بر اساس متن جستجو
    function filterModels() {
        const searchTerm = modelSearch.value.trim().toLowerCase();
        
        // اگر جستجو خالی باشد، همه مدل‌ها نمایش داده شوند
        if (searchTerm === '') {
            modelSelect.innerHTML = '';
            modelsList.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.text;
                option.dataset.provider = model.provider;
                modelSelect.appendChild(option);
            });
            return;
        }
        
        // فیلتر کردن مدل‌ها
        const filteredModels = modelsList.filter(model => 
            model.text.toLowerCase().includes(searchTerm) || 
            model.value.toLowerCase().includes(searchTerm)
        );
        
        // نمایش مدل‌های فیلتر شده
        modelSelect.innerHTML = '';
        if (filteredModels.length > 0) {
            filteredModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.text;
                option.dataset.provider = model.provider;
                modelSelect.appendChild(option);
            });
        } else {
            // اگر هیچ مدلی یافت نشد
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'هیچ مدلی با این عبارت یافت نشد';
            option.disabled = true;
            modelSelect.appendChild(option);
        }
    }

    function confirmModel() {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) {
            showNotification('لطفاً یک مدل را انتخاب کنید');
            return;
        }
        
        selectedModel = selectedOption.value;
        
        // ذخیره مدل انتخاب شده در localStorage
        localStorage.setItem('selectedModel', selectedModel);
        
        showNotification(`مدل ${selectedOption.textContent} انتخاب شد`);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            showNotification('فایلی انتخاب نشد.');
            return;
        }
        
        fileNameDisplay.textContent = file.name;
        originalFileName = file.name.substring(0, file.name.lastIndexOf('.')); // Get file name without extension
        
        // Reset audio related variables here, once per file upload
        audioFiles = {};
        mergedAudioBlob = null;
        mergeAudioBtn.disabled = true;
        downloadAudioBtn.disabled = true;
        updateAudioProgress(0);
        updateAudioStatus();

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            if (file.name.endsWith('.srt')) {
                parseSRT(content);
            } else if (file.name.endsWith('.vtt')) {
                parseVTT(content);
            } else {
                showNotification('لطفاً یک فایل زیرنویس معتبر (.srt یا .vtt) انتخاب کنید');
                srtFileInput.value = '';
                fileNameDisplay.textContent = 'فایلی انتخاب نشده';
                return;
            }

            // After parsing, check if srtContent was populated
            if (srtContent.length === 0) {
                showNotification('فایل زیرنویس خالی یا نامعتبر است. لطفاً فایل دیگری را امتحان کنید.');
                srtFileInput.value = '';
                fileNameDisplay.textContent = 'فایلی انتخاب نشده';
            }
        };
        reader.readAsText(file);
    }

    function parseSRT(content) {
        // Clear previous content
        originalSubtitles.innerHTML = '';
        translatedSubtitles.innerHTML = '';
        translatedContent = [];
        saveBtn.disabled = true;
        
        // Basic SRT parsing
        const entries = content.trim().split(/\n\s*\n/);
        srtContent = entries.map(entry => {
            const lines = entry.trim().split('\n');
            if (lines.length >= 3) {
                const index = parseInt(lines[0]);
                const timeCode = lines[1];
                const text = lines.slice(2).join('\n');
                
                return { index, timeCode, text };
            }
            return null;
        }).filter(entry => entry !== null);
        
        // Display original subtitles
        srtContent.forEach(entry => {
            const subtitleItem = document.createElement('div');
            subtitleItem.className = 'subtitle-item';
            subtitleItem.innerHTML = `
                <div class="subtitle-time">${entry.timeCode}</div>
                <div class="subtitle-text">${entry.text}</div>
            `;
            originalSubtitles.appendChild(subtitleItem);
        });
        
        // بروزرسانی شمارشگر خطوط اصلی
        updateSubtitleCounters();
        
        // بروزرسانی وضعیت دوبله
        updateAudioStatus();
        
        // ذخیره پروژه
        saveProjectData();
        
        showNotification(`${srtContent.length} زیرنویس بارگذاری شد`);
    }

    function parseVTT(content) {
        // Clear previous content
        originalSubtitles.innerHTML = '';
        translatedSubtitles.innerHTML = '';
        translatedContent = [];
        saveBtn.disabled = true;
        
        // Remove WEBVTT header and any comments
        const cleanedContent = content.replace(/WEBVTT\s*\n/, '').replace(/NOTE.*\n/g, '').trim();

        // Split into cues
        const cues = cleanedContent.split(/\n\s*\n/);
        srtContent = cues.map((cue, index) => {
            const lines = cue.trim().split('\n');
            if (lines.length >= 2) {
                // VTT cues can have an optional identifier on the first line
                let timeCodeLineIndex = 0;
                let cueId = null;
                if (!lines[0].includes('-->')) { // If first line is not timecode, it's an ID
                    cueId = lines[0];
                    timeCodeLineIndex = 1;
                }

                const timeCode = lines[timeCodeLineIndex];
                const text = lines.slice(timeCodeLineIndex + 1).join('\n');

                // Convert VTT timecode (HH:MM:SS.mmm) to SRT timecode (HH:MM:SS,mmm)
                const srtTimeCode = timeCode.replace(/\./g, ',');

                return { index: index + 1, timeCode: srtTimeCode, text: text };
            }
            return null;
        }).filter(entry => entry !== null);

        // Display original subtitles
        srtContent.forEach(entry => {
            const subtitleItem = document.createElement('div');
            subtitleItem.className = 'subtitle-item';
            subtitleItem.innerHTML = `
                <div class="subtitle-time">${entry.timeCode}</div>
                <div class="subtitle-text">${entry.text}</div>
            `;
            originalSubtitles.appendChild(subtitleItem);
        });

        // بروزرسانی شمارشگر خطوط اصلی
        updateSubtitleCounters();

        // بروزرسانی وضعیت دوبله
        updateAudioStatus();

        // ذخیره پروژه
        saveProjectData();

        showNotification(`${srtContent.length} زیرنویس بارگذاری شد`);
    }

    async function startTranslation() {
        if (!isConnected || !selectedModel) {
            showNotification('لطفاً ابتدا به API متصل شوید و یک مدل انتخاب کنید');
            return;
        }
        
        if (!srtContent.length) {
            showNotification('لطفاً ابتدا یک فایل زیرنویس انتخاب کنید');
            return;
        }
        
        if (isTranslating) {
            showNotification('ترجمه در حال انجام است');
            return;
        }
        
        // مقداردهی اولیه متغیرهای پیشرفت
        translationStartTime = Date.now();
        translationTimes = [];
        avgTranslationTime = 0;
        
        isTranslating = true;
        pauseTranslation = false;
        currentIndex = 0;
        translatedContent = [];
        
        // پاک کردن فایل‌های صوتی قبلی
        audioFiles = {};
        mergedAudioBlob = null;
        mergeAudioBtn.disabled = true;
        downloadAudioBtn.disabled = true;
        updateAudioProgress(0);
        updateAudioStatus();
        
        translateBtn.disabled = true;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
        clearBtn.disabled = false;
        saveBtn.disabled = true;
        
        progressSection.style.display = 'block';
        updateProgress(0, 0);
        
        // پاک کردن محتوای قبلی
        translatedSubtitles.innerHTML = '';
        
        // اضافه کردن المان‌های خالی برای هر زیرنویس
        srtContent.forEach((item, index) => {
            addSubtitlePlaceholder(index);
        });
        
        showNotification('ترجمه آغاز شد');
        
        // شروع ترجمه زیرنویس‌ها
        await translateNextSubtitle();
    }

    async function translateNextSubtitle() {
        if (currentIndex >= srtContent.length || !isTranslating || pauseTranslation) {
            if (currentIndex >= srtContent.length) {
                finishTranslation();
            }
            return;
        }
        
        const subtitle = srtContent[currentIndex];
        const tone = toneSelect.value;
        
        try {
            const startTime = new Date();
            
            const translatedText = await translateText(subtitle.text, tone);
            
            // Calculate time taken for this translation
            const endTime = new Date();
            const timeTaken = (endTime - startTime) / 1000; // in seconds
            translationTimes.push(timeTaken);
            
            // Calculate average time and update progress
            updateTranslationProgress();
            
            // Save translated subtitle to array for later export
            translatedContent.push({
                index: subtitle.index,
                timeCode: subtitle.timeCode,
                text: translatedText
            });
            
            // پیدا کردن و به‌روزرسانی placeholder موجود
            const subtitleItem = translatedSubtitles.querySelector(`.subtitle-item[data-index="${currentIndex}"]`);
            if (subtitleItem) {
                // به‌روزرسانی متن زیرنویس و حذف کلاس placeholder
                const subtitleText = subtitleItem.querySelector('.subtitle-text');
                if (subtitleText) {
                    subtitleText.textContent = translatedText;
                    subtitleText.classList.remove('placeholder');
                }
                
                // اضافه کردن کد زمانی زیرنویس
                const timeElement = document.createElement('div');
                timeElement.className = 'subtitle-time';
                timeElement.textContent = subtitle.timeCode;
                subtitleItem.insertBefore(timeElement, subtitleText);
                
                // فعال‌سازی دکمه‌های ویرایش و ترجمه مجدد
                const editBtn = subtitleItem.querySelector('.edit-btn');
                const retranslateBtn = subtitleItem.querySelector('.retranslate-btn');
                const audioUploadBtn = subtitleItem.querySelector('.audio-upload-btn');
                
                if (editBtn) editBtn.disabled = false;
                if (retranslateBtn) retranslateBtn.disabled = false;
                if (audioUploadBtn) audioUploadBtn.disabled = false;
            }
            
            // بروزرسانی شمارشگر خطوط ترجمه شده
            updateSubtitleCounters();
            
            // ذخیره پیشرفت ترجمه
            saveProjectData();
            
            // Move to next subtitle
            currentIndex++;
            
            // Continue with next subtitle after a small delay
            setTimeout(translateNextSubtitle, 100);
        } catch (error) {
            console.error('Translation error:', error);
            showNotification('خطا در ترجمه. لطفاً دوباره تلاش کنید');
            pauseTranslationProcess();
        }
    }

    async function translateText(text, tone) {
        const targetLanguageCode = targetLanguageSelect.value;
        const targetLanguageName = getLanguageName(targetLanguageCode);
        let prompt;
        switch (tone) {
            case 'formal':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن رسمی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'informal':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن غیر رسمی و محاوره‌ای انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'professional':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن حرفه‌ای انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'scientific':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن علمی و تخصصی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'informative':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن اطلاعاتی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'conversational':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن گفتاری و روزمره انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'movie':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن حرفه‌ای مخصوص فیلم و سریال انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'humorous':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن طنز و شوخ‌طبعانه انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'poetic':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن شاعرانه و ادبی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'dramatic':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن دراماتیک و احساسی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'uncensored':
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} با لحن کاملاً محاوره‌ای و گفتاری انجام بده. تمام کلمات و عبارات را دقیقاً همانطور که هستند و بدون هیچ سانسوری ترجمه کن، حتی اگر رکیک یا توهین‌آمیز باشند. از زبان محلی و روزمره استفاده کن و ترجمه را شبیه به گفت‌وگوی طبیعی و محلی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            default:
                prompt = `ترجمه زیرنویس زیر را به ${targetLanguageName} انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
        }
        
        try {
            // فقط از OpenRouter استفاده می‌کنیم
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: `شما یک مترجم حرفه‌ای هستید که زیرنویس‌ها را به ${targetLanguageName} ترجمه می‌کند.` },
                        { role: 'user', content: prompt }
                    ],
                    temperature: parseFloat(creativityLevelSelect.value),
                    max_tokens: 256
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('API error:', error);
            throw error;
        }
    }

    // Helper function to get language name in Persian
    function getLanguageName(code) {
        switch (code) {
            case 'fa': return 'فارسی';
            case 'en': return 'انگلیسی';
            case 'ar': return 'عربی';
            case 'fr': return 'فرانسوی';
            case 'de': return 'آلمانی';
            case 'es': return 'اسپانیایی';
            case 'zh': return 'چینی';
            case 'ru': return 'روسی';
            case 'ja': return 'ژاپنی';
            case 'ko': return 'کره‌ای';
            case 'it': return 'ایتالیایی';
            case 'pt': return 'پرتغالی';
            case 'tr': return 'ترکی';
            case 'hi': return 'هندی';
            case 'bn': return 'بنگالی';
            default: return 'فارسی'; // Default to Persian
        }
    }

    // Update progress bar and remaining time estimation
    function updateTranslationProgress() {
        const totalSubtitles = srtContent.length;
        const completedSubtitles = currentIndex;
        
        // Calculate progress percentage
        const progressPercent = Math.round((completedSubtitles / totalSubtitles) * 100);
        
        // Calculate average translation time
        if (translationTimes.length > 0) {
            avgTranslationTime = translationTimes.reduce((a, b) => a + b, 0) / translationTimes.length;
        }
        
        // Estimate remaining time
        const remainingSubtitles = totalSubtitles - completedSubtitles;
        const estimatedRemainingSeconds = Math.round(remainingSubtitles * avgTranslationTime);
        
        // Update UI
        updateProgress(progressPercent, estimatedRemainingSeconds);
    }
    
    // Update the progress UI elements
    function updateProgress(percent, remainingSeconds) {
        // Convert Persian numbers for percentage
        const persianPercent = toPersianNumbers(percent);
        progressBar.style.width = `${percent}%`;
        progressPercentage.textContent = `${persianPercent}٪`;
        
        // Update remaining time text
        if (remainingSeconds !== undefined) {
            const remainingText = formatRemainingTime(remainingSeconds);
            remainingTime.textContent = `زمان باقیمانده: ${remainingText}`;
        } else {
            remainingTime.textContent = 'زمان باقیمانده: در حال محاسبه...';
        }
    }
    
    // Format remaining time in a human-readable format
    function formatRemainingTime(seconds) {
        if (seconds < 60) {
            return `${toPersianNumbers(seconds)} ثانیه`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${toPersianNumbers(minutes)} دقیقه و ${toPersianNumbers(remainingSeconds)} ثانیه`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${toPersianNumbers(hours)} ساعت و ${toPersianNumbers(minutes)} دقیقه`;
        }
    }
    
    // Convert English numbers to Persian
    function toPersianNumbers(num) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/[0-9]/g, function(w) {
            return persianDigits[+w];
        });
    }

    function pauseTranslationProcess() {
        if (isTranslating) {
            pauseTranslation = true;
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
            saveBtn.disabled = false;
            showNotification('ترجمه متوقف شد');
        }
    }

    function resumeTranslationProcess() {
        if (isTranslating && pauseTranslation) {
            pauseTranslation = false;
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
            showNotification('ترجمه ادامه یافت');
            translateNextSubtitle();
        }
    }

    function clearTranslationProcess() {
        // توقف فرآیند ترجمه در حال اجرا
        pauseTranslation = true;
        isTranslating = false;
        
        // پاک کردن محتوای زیرنویس‌های ترجمه شده
        translatedContent = [];
        translatedSubtitles.innerHTML = '';
        
        // بازنشانی شمارنده‌ها و نوار پیشرفت
        currentIndex = 0;
        updateProgress(0, 0);
        progressPercentage.textContent = '۰٪';
        remainingTime.textContent = 'زمان باقیمانده: در حال محاسبه...';
        updateSubtitleCounters();
        
        // بازنشانی وضعیت دوبله
        updateAudioStatus();
        
        // بازنشانی وضعیت دکمه‌ها
        translateBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        clearBtn.disabled = true;
        saveBtn.disabled = true;
        
        // ذخیره وضعیت جدید
        saveProjectData();
        
        showNotification('ترجمه‌ها پاک شدند');
    }

    function resetFile() {
        // اگر در حال ترجمه هستیم، ابتدا فرآیند ترجمه را متوقف می‌کنیم
        if (isTranslating) {
            pauseTranslation = true;
            isTranslating = false;
        }
        
        // پاک کردن داده‌های فایل و زیرنویس‌ها
        srtContent = [];
        translatedContent = [];
        originalFileName = '';
        
        // پاک کردن محتوای نمایشی
        originalSubtitles.innerHTML = '';
        translatedSubtitles.innerHTML = '';
        
        // پاک کردن اطلاعات فایل
        srtFileInput.value = '';
        fileNameDisplay.textContent = 'فایلی انتخاب نشده';
        
        // بازنشانی شمارنده‌ها و نوار پیشرفت
        currentIndex = 0;
        updateProgress(0, 0);
        progressPercentage.textContent = '۰٪';
        remainingTime.textContent = 'زمان باقیمانده: در حال محاسبه...';
        progressSection.style.display = 'none';
        updateSubtitleCounters();
        
        // بازنشانی وضعیت دوبله
        audioFiles = {};
        mergedAudioBlob = null;
        mergeAudioBtn.disabled = true;
        downloadAudioBtn.disabled = true;
        updateAudioProgress(0);
        updateAudioStatus();
        
        // بازنشانی وضعیت دکمه‌ها
        translateBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        clearBtn.disabled = true;
        saveBtn.disabled = true;
        
        // پاک کردن داده‌های ذخیره شده
        clearProjectData();
        
        showNotification('فایل و متن اصلی پاک شدند');
    }

    function finishTranslation() {
        isTranslating = false;
        pauseTranslation = false;
        
        translateBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        clearBtn.disabled = false;
        saveBtn.disabled = false;
        
        updateProgress(100, 0);
        progressPercentage.textContent = '۱۰۰٪';
        remainingTime.textContent = 'زمان باقیمانده: ۰ ثانیه';
        
        showNotification('ترجمه به پایان رسید');
    }

    function saveTranslatedSubtitles() {
        if (translatedContent.length === 0) {
            showNotification('زیرنویس ترجمه شده‌ای برای ذخیره وجود ندارد');
            return;
        }
        
        const outputFormat = outputFormatSelect.value;
        const tone = toneSelect.options[toneSelect.selectedIndex].text;
        const targetLanguageCode = targetLanguageSelect.value;
        
        let fileContent = '';
        let fileExtension = '';
        let mimeType = '';

        if (outputFormat === 'srt') {
            fileContent = formatSRT(translatedContent);
            fileExtension = 'srt';
            mimeType = 'text/srt;charset=utf-8';
        } else if (outputFormat === 'vtt') {
            fileContent = formatVTT(translatedContent);
            fileExtension = 'vtt';
            mimeType = 'text/vtt;charset=utf-8';
        } else {
            showNotification('فرمت خروجی نامعتبر است.');
            return;
        }
        
        const blob = new Blob([fileContent], { type: mimeType });
        
        // اضافه کردن پسوند ناقص اگر ترجمه کامل نشده باشد
        let fileName = '';
        if (isTranslating && pauseTranslation) {
            fileName = `${originalFileName}_${targetLanguageCode}_${tone}_ناقص.${fileExtension}`;
        } else {
            fileName = `${originalFileName}_${targetLanguageCode}_${tone}.${fileExtension}`;
        }
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showNotification(`فایل زیرنویس با نام ${fileName} ذخیره شد`);
    }

    // Helper function to format subtitles as SRT
    function formatSRT(subtitles) {
        let srtData = '';
        subtitles.forEach(subtitle => {
            srtData += subtitle.index + '\n';
            srtData += subtitle.timeCode + '\n';
            srtData += subtitle.text + '\n\n';
        });
        return srtData;
    }

    // Helper function to format subtitles as VTT
    function formatVTT(subtitles) {
        let vttData = 'WEBVTT\n\n';
        subtitles.forEach(subtitle => {
            // Convert SRT timecode (HH:MM:SS,mmm) to VTT timecode (HH:MM:SS.mmm)
            const vttTimeCode = subtitle.timeCode.replace(/,/g, '.');
            vttData += `${subtitle.index}\n`; // VTT can have optional cue identifiers
            vttData += `${vttTimeCode}\n`;
            vttData += `${subtitle.text}\n\n`;
        });
        return vttData;
    }
    
    // Function to toggle edit mode for a subtitle
    function toggleEdit(subtitleTextElement, index) {
        const isEditing = subtitleTextElement.contentEditable === 'true';
        
        if (isEditing) {
            // Save changes
            subtitleTextElement.contentEditable = 'false';
            subtitleTextElement.classList.remove('editing');
            
            // Update translated content in the array
            const newText = subtitleTextElement.innerText.trim();
            translatedContent[index].text = newText;
            
            // ذخیره تغییرات
            saveProjectData();
            
            showNotification('تغییرات ذخیره شد');
        } else {
            // Enter edit mode
            subtitleTextElement.contentEditable = 'true';
            subtitleTextElement.classList.add('editing');
            subtitleTextElement.focus();
            
            // Place cursor at the end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(subtitleTextElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            
            showNotification('در حال ویرایش. برای ذخیره، دوباره کلیک کنید');
        }
    }
    
    // Function to retranslate a specific subtitle
    async function retranslateSubtitle(index) {
        if (!isConnected || !selectedModel) {
            showNotification('لطفاً ابتدا به API متصل شوید و یک مدل انتخاب کنید');
            return;
        }
        
        const subtitle = srtContent[index];
        const subtitleItem = translatedSubtitles.querySelector(`[data-index="${index}"]`);
        const subtitleText = subtitleItem.querySelector('.subtitle-text');
        const retranslateBtn = subtitleItem.querySelector('.retranslate-btn');
        
        // Disable retranslate button and show loading state
        retranslateBtn.disabled = true;
        retranslateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const tone = toneSelect.value;
            const translatedText = await translateText(subtitle.text, tone);
            
            // Update the displayed text
            subtitleText.textContent = translatedText;
            
            // Update content in the array
            translatedContent[index].text = translatedText;
            
            // ذخیره تغییرات
            saveProjectData();
            
            showNotification('ترجمه مجدد با موفقیت انجام شد');
        } catch (error) {
            console.error('Retranslation error:', error);
            showNotification('خطا در ترجمه مجدد');
        } finally {
            // Restore button state
            retranslateBtn.disabled = false;
            retranslateBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
    }

    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }

    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // بروزرسانی شمارنده‌های خطوط زیرنویس
    function updateSubtitleCounters() {
        originalCounter.textContent = `تعداد خطوط: ${toPersianNumbers(srtContent.length)}`;
        translatedCounter.textContent = `تعداد خطوط: ${toPersianNumbers(translatedContent.length)}`;
    }
    
    function addSubtitlePlaceholder(index) {
        const subtitle = srtContent[index];
        
        const subtitleItem = document.createElement('div');
        subtitleItem.className = 'subtitle-item';
        subtitleItem.dataset.index = index;
        
        const timeElement = document.createElement('div');
        timeElement.className = 'subtitle-time';
        timeElement.textContent = subtitle.timeCode; // Use the timeCode from the original subtitle
        
        const subtitleText = document.createElement('div');
        subtitleText.className = 'subtitle-text placeholder';
        subtitleText.textContent = 'در حال ترجمه...';
        
        const subtitleActions = document.createElement('div');
        subtitleActions.className = 'subtitle-actions';
        subtitleActions.innerHTML = `
            <button class="action-btn edit-btn" disabled title="ویرایش متن">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn retranslate-btn" disabled title="ترجمه مجدد">
                <i class="fas fa-sync"></i>
            </button>
            <button class="action-btn time-edit-btn" title="ویرایش زمان">
                <i class="fas fa-clock"></i>
            </button>
        `;
        
        // اضافه کردن بخش آپلود فایل صوتی
        const subtitleAudioActions = document.createElement('div');
        subtitleAudioActions.className = 'subtitle-audio-actions';
        subtitleAudioActions.innerHTML = `
            <input type="file" class="audio-file-input" accept="audio/*" style="display: none;">
            <button class="audio-upload-btn" disabled>
                <i class="fas fa-microphone"></i>
                افزودن صدا
            </button>
            <div class="audio-status">فایل صوتی: بدون صدا</div>
        `;
        
        subtitleItem.appendChild(timeElement); // Add time element first
        subtitleItem.appendChild(subtitleText);
        subtitleItem.appendChild(subtitleActions);
        subtitleItem.appendChild(subtitleAudioActions);
        
        translatedSubtitles.appendChild(subtitleItem);

        const audioFileInput = subtitleAudioActions.querySelector('.audio-file-input');
        const audioUploadBtn = subtitleAudioActions.querySelector('.audio-upload-btn');
        const audioStatus = subtitleAudioActions.querySelector('.audio-status');

        audioUploadBtn.addEventListener('click', () => {
            audioFileInput.click(); // Trigger click on hidden file input
        });

        audioFileInput.addEventListener('change', async (e) => {
            const audioFile = e.target.files[0];
            if (audioFile) {
                // بررسی نوع فایل صوتی
                const supportedFormats = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/webm'];
                const fileExtension = audioFile.name.toLowerCase().split('.').pop();
                const supportedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
                
                if (!audioFile.type.startsWith('audio/') && !supportedExtensions.includes(fileExtension)) {
                    showNotification('فرمت فایل صوتی پشتیبانی نمی‌شود. فرمت‌های مجاز: MP3, WAV, OGG, M4A, AAC, FLAC, WebM');
                    return;
                }

                // بررسی حجم فایل (حداکثر 50 مگابایت)
                if (audioFile.size > 50 * 1024 * 1024) {
                    showNotification('حجم فایل صوتی نباید بیش از 50 مگابایت باشد.');
                    return;
                }

                try {
                    // تست خواندن فایل صوتی
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await audioFile.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    // محاسبه مدت زمان زیرنویس
                    const subtitle = srtContent[index];
                    const timeParts = subtitle.timeCode.split(' --> ');
                    const startTime = parseTimeToSeconds(timeParts[0]);
                    const endTime = parseTimeToSeconds(timeParts[1]);
                    const subtitleDuration = endTime - startTime;
                    
                    // نمایش اطلاعات فایل صوتی
                    const audioDuration = audioBuffer.duration;
                    const duration = audioDuration.toFixed(1);
                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    
                    // بررسی تطابق زمان
                    const timeDifference = Math.abs(audioDuration - subtitleDuration);
                    let timeWarning = '';
                    
                    if (audioDuration > subtitleDuration + 0.5) {
                        timeWarning = `⚠️ فایل صوتی ${(audioDuration - subtitleDuration).toFixed(1)}s طولانی‌تر است`;
                    } else if (audioDuration < subtitleDuration - 0.5) {
                        timeWarning = `⚠️ فایل صوتی ${(subtitleDuration - audioDuration).toFixed(1)}s کوتاه‌تر است`;
                    } else {
                        timeWarning = '✅ زمان‌بندی مناسب';
                    }
                    
                // Store the audio file with its corresponding subtitle index
                audioFiles[index] = audioFile;
                    audioStatus.innerHTML = `
                        <div class="audio-file-info">
                            <div class="audio-file-name">📁 ${audioFile.name}</div>
                            <div class="audio-file-details">
                                ⏱️ ${duration}s | 🔊 ${channels}ch | 📊 ${sampleRate}Hz
                            </div>
                            <div class="audio-time-warning ${audioDuration > subtitleDuration + 0.5 ? 'warning' : audioDuration < subtitleDuration - 0.5 ? 'error' : 'success'}">
                                ${timeWarning}
                            </div>
                        </div>
                    `;
                    subtitleItem.classList.add('has-audio');
                    
                    // اضافه کردن دکمه پخش پیش‌نمایش
                    if (!subtitleAudioActions.querySelector('.audio-preview-btn')) {
                        const previewBtn = document.createElement('button');
                        previewBtn.className = 'audio-preview-btn';
                        previewBtn.innerHTML = '<i class="fas fa-play"></i> پیش‌نمایش';
                        previewBtn.addEventListener('click', () => playAudioPreview(audioFile));
                        subtitleAudioActions.appendChild(previewBtn);
                    }
                    
                    // اضافه کردن دکمه ویرایش فایل صوتی
                    if (!subtitleAudioActions.querySelector('.audio-edit-btn')) {
                        const editAudioBtn = document.createElement('button');
                        editAudioBtn.className = 'audio-edit-btn';
                        editAudioBtn.innerHTML = '<i class="fas fa-cut"></i> ویرایش';
                        editAudioBtn.title = 'برش و تنظیم فایل صوتی';
                        editAudioBtn.addEventListener('click', () => openAudioEditor(index, audioFile));
                        subtitleAudioActions.appendChild(editAudioBtn);
                    }
                    
                    // اضافه کردن دکمه حذف فایل صوتی
                    if (!subtitleAudioActions.querySelector('.audio-remove-btn')) {
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'audio-remove-btn';
                        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
                        removeBtn.title = 'حذف فایل صوتی';
                        removeBtn.addEventListener('click', () => {
                            delete audioFiles[index];
                            audioStatus.textContent = 'فایل صوتی: بدون صدا';
                            subtitleItem.classList.remove('has-audio');
                            removeBtn.remove();
                            const previewBtn = subtitleAudioActions.querySelector('.audio-preview-btn');
                            if (previewBtn) previewBtn.remove();
                            
                            // اگر فایل ترکیب شده وجود دارد، آن را نامعتبر کن
                            if (mergedAudioBlob) {
                                downloadAudioBtn.disabled = true;
                            }
                            
                            if (Object.keys(audioFiles).length === 0) {
                                mergeAudioBtn.disabled = true;
                                mergedAudioBlob = null;
                                lastMergeHash = null;
                            }
                            
                            // بروزرسانی وضعیت دوبله
                            updateAudioStatus();
                            showNotification('فایل صوتی حذف شد.');
                        });
                        subtitleAudioActions.appendChild(removeBtn);
                    }
                    
                showNotification(`فایل صوتی ${audioFile.name} برای زیرنویس ${index + 1} اضافه شد.`);
                
                // Enable merge audio button if there are audio files
                if (Object.keys(audioFiles).length > 0) {
                    mergeAudioBtn.disabled = false;
                }
                
                // بروزرسانی وضعیت دوبله
                updateAudioStatus();
                    
                } catch (error) {
                    console.error('خطا در پردازش فایل صوتی:', error);
                    showNotification('فایل صوتی معتبر نیست یا قابل خواندن نمی‌باشد.');
                }
            } else {
                audioStatus.textContent = 'فایل صوتی: بدون صدا';
                subtitleItem.classList.remove('has-audio');
                delete audioFiles[index];
                showNotification('فایل صوتی انتخاب نشد.');
                
                // Disable merge audio button if no audio files
                if (Object.keys(audioFiles).length === 0) {
                    mergeAudioBtn.disabled = true;
                }
                
                // بروزرسانی وضعیت دوبله
                updateAudioStatus();
            }
        });

        // تابع پخش پیش‌نمایش فایل صوتی
        function playAudioPreview(audioFile) {
            // توقف پخش قبلی در صورت وجود
            if (window.currentAudioPreview) {
                window.currentAudioPreview.pause();
                window.currentAudioPreview = null;
            }

            const audio = new Audio();
            audio.src = URL.createObjectURL(audioFile);
            audio.volume = 0.7;
            
            audio.addEventListener('loadeddata', () => {
                audio.play().catch(error => {
                    console.error('خطا در پخش پیش‌نمایش:', error);
                    showNotification('خطا در پخش پیش‌نمایش صوتی.');
                });
            });

            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audio.src);
                window.currentAudioPreview = null;
            });

            audio.addEventListener('error', () => {
                showNotification('خطا در پخش فایل صوتی.');
                URL.revokeObjectURL(audio.src);
                window.currentAudioPreview = null;
            });

            window.currentAudioPreview = audio;
            showNotification('در حال پخش پیش‌نمایش...');
        }
    }

    // ویرایشگر فایل صوتی
    let currentEditingIndex = null;
    let currentAudioBuffer = null;
    let originalAudioBuffer = null;
    let currentAudioFile = null;
    let audioContext = null;
    let audioSource = null;
    let audioStartOffset = 0;
    let audioEndOffset = 1;
    let audioPlaybackRateVal = 1;
    let isPlaying = false;
    let startTime = 0;
    let pausedAt = 0;

    function openAudioEditor(index, audioFile, buffer) {
        // اگر buffer مقدار ندارد، از طریق AudioContext آن را بسازیم
        if (!buffer) {
            createAudioBuffer(audioFile).then(newBuffer => {
                openAudioEditorWithBuffer(index, audioFile, newBuffer);
            }).catch(error => {
                console.error('خطا در پردازش فایل صوتی:', error);
                showNotification('خطا در پردازش فایل صوتی');
            });
        } else {
            openAudioEditorWithBuffer(index, audioFile, buffer);
        }
    }
    
    // تبدیل فایل به AudioBuffer
    async function createAudioBuffer(audioFile) {
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
    }
    
    function openAudioEditorWithBuffer(index, audioFile, buffer) {
        // ذخیره اطلاعات فایل فعلی
        currentEditingIndex = index;
        currentAudioFile = audioFile;
        originalAudioBuffer = buffer;
        currentAudioBuffer = buffer;
        
                 // بازنشانی متغیرها
         audioStartOffset = 0;
         audioEndOffset = 1;
         audioPlaybackRateVal = 1;
         isPlaying = false;
         startTime = 0;
         pausedAt = 0;
        
        // استخراج اطلاعات زمان زیرنویس
        const subtitle = srtContent[index];
        const timeParts = subtitle.timeCode.split(' --> ');
        const startTimeStr = timeParts[0];
        const endTimeStr = timeParts[1];
        const subtitleDurationSeconds = parseTimeToSeconds(endTimeStr) - parseTimeToSeconds(startTimeStr);
        
        // تنظیم نمایش زمان زیرنویس
        subtitleTimeDisplay.textContent = subtitle.timeCode;
        subtitleDurationDisplay.textContent = `${toPersianNumbers(subtitleDurationSeconds.toFixed(2))} ثانیه`;
        
        // تنظیم نمایش اطلاعات صوتی
        const durationSeconds = buffer.duration;
        audioStartTime.textContent = `شروع: ۰۰:۰۰.۰۰۰`;
        audioEndTime.textContent = `پایان: ${formatTime(durationSeconds)}`;
        audioDuration.textContent = `مدت: ${toPersianNumbers(durationSeconds.toFixed(2))} ثانیه`;
        
        // تنظیم دامنه اسلایدرها
        audioTrimStart.min = 0;
        audioTrimStart.max = 99;
        audioTrimStart.value = 0;
        audioTrimEnd.min = 1;
        audioTrimEnd.max = 100;
        audioTrimEnd.value = 100;
        audioPlaybackRate.value = 1;
        
        // تنظیم نمایش مقادیر
        audioTrimStartValue.textContent = `${toPersianNumbers('0.00')}s`;
        audioTrimEndValue.textContent = `${toPersianNumbers(durationSeconds.toFixed(2))}s`;
        audioPlaybackRateValue.textContent = `${toPersianNumbers('1.00')}x`;
        
        // تنظیم دکمه پخش
        audioPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i> پخش';
        
        // نمایش مودال
        audioEditorModal.classList.add('show');
        
        // رسم شکل موج صوتی (ساده)
        drawSimpleWaveform(buffer);
        
        // اضافه کردن رویدادها
        setupAudioEditorEvents();
    }

    // رسم شکل موج ساده
    function drawSimpleWaveform(buffer) {
        if (!buffer || !audioWaveform) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = audioWaveform.clientWidth || 300;
        canvas.height = audioWaveform.clientHeight || 100;
        audioWaveform.innerHTML = '';
        audioWaveform.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // رسم خط وسط
        ctx.beginPath();
        ctx.moveTo(0, amp);
        ctx.lineTo(canvas.width, amp);
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.stroke();
        
        // رسم شکل موج
        ctx.beginPath();
        
        // رسم نقاط شکل موج
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            for (let j = 0; j < step; j++) {
                const index = (i * step) + j;
                if (index < data.length) {
                    const datum = data[index];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
            }
            
            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        
        ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#90CAF9' : '#2196F3';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // رسم خطوط محدوده برش
        drawTrimLines();
    }
    
    // رسم خطوط محدوده برش
    function drawTrimLines() {
        const canvas = audioWaveform ? audioWaveform.querySelector('canvas') : null;
        if (!canvas || !currentAudioBuffer) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const startX = canvas.width * audioStartOffset;
        const endX = canvas.width * audioEndOffset;
        
        // رسم محدوده انتخاب شده (بدون رسم مجدد شکل موج)
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        
        // رسم خطوط ابتدا و انتها
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, canvas.height);
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, canvas.height);
        ctx.strokeStyle = '#F44336';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // تبدیل ثانیه به فرمت زمانی
    function formatTime(seconds) {
        const ms = Math.floor((seconds % 1) * 1000);
        seconds = Math.floor(seconds);
        const s = seconds % 60;
        const m = Math.floor(seconds / 60) % 60;
        const h = Math.floor(seconds / 3600);
        
        const msStr = ms.toString().padStart(3, '0');
        const sStr = s.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const hStr = h.toString().padStart(2, '0');
        
        return `${toPersianNumbers(hStr)}:${toPersianNumbers(mStr)}:${toPersianNumbers(sStr)}.${toPersianNumbers(msStr)}`;
    }
    
    // تنظیم رویدادها
    function setupAudioEditorEvents() {
        // رویداد دکمه بستن
        closeAudioEditorBtn.onclick = closeAudioEditor;
        
        // رویداد کلیک خارج از محتوا
        audioEditorModal.addEventListener('click', (e) => {
            if (e.target === audioEditorModal) {
                closeAudioEditor();
            }
        });
        
        // رویداد کلید Escape
        document.addEventListener('keydown', handleAudioEditorKeydown);
        
        // رویداد تغییر برش ابتدا
        audioTrimStart.oninput = () => {
            if (!currentAudioBuffer) return;
            
            const maxVal = parseFloat(audioTrimEnd.value) - 1;
            if (parseFloat(audioTrimStart.value) > maxVal) {
                audioTrimStart.value = maxVal;
            }
            
            audioStartOffset = parseFloat(audioTrimStart.value) / 100;
            const startSeconds = audioStartOffset * currentAudioBuffer.duration;
            audioTrimStartValue.textContent = `${toPersianNumbers(startSeconds.toFixed(2))}s`;
            audioStartTime.textContent = `شروع: ${formatTime(startSeconds)}`;
            updateAudioDuration();
            
            // بازسازی کامل شکل موج به جای فقط خطوط برش
            if (pausedAt > 0) {
                pausedAt = Math.max(startSeconds, pausedAt);
            }
            drawSimpleWaveform(currentAudioBuffer);
        };
        
        // رویداد تغییر برش انتها
        audioTrimEnd.oninput = () => {
            if (!currentAudioBuffer) return;
            
            const minVal = parseFloat(audioTrimStart.value) + 1;
            if (parseFloat(audioTrimEnd.value) < minVal) {
                audioTrimEnd.value = minVal;
            }
            
            audioEndOffset = parseFloat(audioTrimEnd.value) / 100;
            const endSeconds = audioEndOffset * currentAudioBuffer.duration;
            audioTrimEndValue.textContent = `${toPersianNumbers(endSeconds.toFixed(2))}s`;
            audioEndTime.textContent = `پایان: ${formatTime(endSeconds)}`;
            updateAudioDuration();
            
            // بازسازی کامل شکل موج به جای فقط خطوط برش
            drawSimpleWaveform(currentAudioBuffer);
        };
        
        // رویداد تغییر سرعت پخش
        audioPlaybackRate.oninput = () => {
            audioPlaybackRateVal = parseFloat(audioPlaybackRate.value);
            audioPlaybackRateDisplay.textContent = `${toPersianNumbers(audioPlaybackRateVal.toFixed(2))}x`;
            updateAudioDuration();
        };
        
        // رویداد دکمه پخش/توقف
        audioPlayPauseBtn.onclick = togglePlayPause;
        
        // رویداد دکمه بازنشانی
        audioResetBtn.onclick = resetAudioEditor;
        
        // رویداد دکمه اعمال تغییرات
        audioApplyBtn.onclick = applyAudioChanges;
    }
    
    // بروزرسانی نمایش مدت زمان
    function updateAudioDuration() {
        const startSeconds = audioStartOffset * currentAudioBuffer.duration;
        const endSeconds = audioEndOffset * currentAudioBuffer.duration;
        const durationSeconds = (endSeconds - startSeconds) / audioPlaybackRateVal;
        audioDuration.textContent = `مدت: ${toPersianNumbers(durationSeconds.toFixed(2))} ثانیه`;
    }
    
    // توقف پخش صوت ویرایشگر
    function stopAudioPlayback() {
        if (audioSource) {
            audioSource.stop();
            audioSource = null;
        }
        
        isPlaying = false;
        audioPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i> پخش';
    }
    
    // تغییر وضعیت پخش/توقف
    function togglePlayPause() {
        if (!currentAudioBuffer) return;
        
        if (isPlaying) {
            // توقف پخش
            pausedAt = (audioContext.currentTime - startTime) * audioPlaybackRateVal + audioStartOffset * currentAudioBuffer.duration;
            stopAudioPlayback();
        } else {
            // شروع پخش
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const startSeconds = audioStartOffset * currentAudioBuffer.duration;
            const endSeconds = audioEndOffset * currentAudioBuffer.duration;
            const duration = endSeconds - startSeconds;
            
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = currentAudioBuffer;
            audioSource.connect(audioContext.destination);
            audioSource.playbackRate.value = audioPlaybackRateVal;
            
            // تنظیم زمان شروع و مدت پخش
            const offset = pausedAt > 0 ? pausedAt : startSeconds;
            audioSource.start(0, offset, duration - (offset - startSeconds));
            
            startTime = audioContext.currentTime;
            pausedAt = 0;
            
            // تنظیم توقف خودکار در پایان
            audioSource.onended = () => {
                stopAudioPlayback();
            };
            
            isPlaying = true;
            audioPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i> توقف';
        }
    }
    
    // بازنشانی ویرایشگر
    function resetAudioEditor() {
        // توقف پخش
        stopAudioPlayback();
        
        // بازنشانی مقادیر
        audioStartOffset = 0;
        audioEndOffset = 1;
        audioPlaybackRateVal = 1;
        pausedAt = 0;
        
        // بازنشانی اسلایدرها
        audioTrimStart.value = 0;
        audioTrimEnd.value = 100;
        audioPlaybackRate.value = 1;
        
        // بروزرسانی نمایش
        const durationSeconds = currentAudioBuffer.duration;
        audioTrimStartValue.textContent = `${toPersianNumbers('0.00')}s`;
        audioTrimEndValue.textContent = `${toPersianNumbers(durationSeconds.toFixed(2))}s`;
        audioPlaybackRateDisplay.textContent = `${toPersianNumbers('1.00')}x`;
        audioStartTime.textContent = `شروع: ۰۰:۰۰.۰۰۰`;
        audioEndTime.textContent = `پایان: ${formatTime(durationSeconds)}`;
        audioDuration.textContent = `مدت: ${toPersianNumbers(durationSeconds.toFixed(2))} ثانیه`;
        
        // بازنشانی بافر صوتی به حالت اصلی
        currentAudioBuffer = originalAudioBuffer;
        
        // بروزرسانی نمایش
        drawSimpleWaveform(currentAudioBuffer);
    }
    
    // اعمال تغییرات روی فایل صوتی
    function applyAudioChanges() {
        if (!currentAudioBuffer || currentEditingIndex === null) {
            closeAudioEditor();
            return;
        }
        
        try {
            // ایجاد AudioContext اگر وجود ندارد
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // محاسبه مقادیر برش
            const startSeconds = audioStartOffset * currentAudioBuffer.duration;
            const endSeconds = audioEndOffset * currentAudioBuffer.duration;
            const duration = endSeconds - startSeconds;
            
            // ایجاد بافر جدید برای بخش برش شده
            const sampleRate = currentAudioBuffer.sampleRate;
            const frameCount = Math.ceil(duration * sampleRate);
            const newBuffer = audioContext.createBuffer(
                currentAudioBuffer.numberOfChannels,
                frameCount,
                sampleRate
            );
            
            // کپی داده‌های صوتی از بافر اصلی به بافر جدید
            for (let channel = 0; channel < currentAudioBuffer.numberOfChannels; channel++) {
                const sourceData = currentAudioBuffer.getChannelData(channel);
                const newData = newBuffer.getChannelData(channel);
                
                const startFrame = Math.floor(startSeconds * sampleRate);
                const framesCount = Math.min(frameCount, sourceData.length - startFrame);
                
                for (let i = 0; i < framesCount; i++) {
                    newData[i] = sourceData[startFrame + i];
                }
            }
            
            // تبدیل بافر به فایل
            let finalBlob;
            if (audioPlaybackRateVal !== 1) {
                // تنظیم سرعت پخش در متادیتا
                // توجه: تغییر واقعی سرعت نیاز به پردازش پیچیده‌تری دارد که خارج از محدوده این پروژه است
                // اینجا فقط این اطلاعات را در متادیتا ذخیره می‌کنیم
                const wavBlob = audioBufferToWav(newBuffer);
                finalBlob = new Blob([wavBlob], { type: 'audio/wav' });
                
                // ذخیره اطلاعات سرعت پخش در localStorage
                const playbackRates = JSON.parse(localStorage.getItem('audioPlaybackRates') || '{}');
                playbackRates[currentEditingIndex] = audioPlaybackRateVal;
                localStorage.setItem('audioPlaybackRates', JSON.stringify(playbackRates));
            } else {
                finalBlob = audioBufferToWav(newBuffer);
            }
            
            // ایجاد فایل جدید
            const fileName = currentAudioFile.name;
            const fileType = currentAudioFile.type || 'audio/wav';
            const newFile = new File([finalBlob], fileName, { type: fileType });
            
            // ذخیره فایل در آرایه
            audioFiles[currentEditingIndex] = newFile;
            
            // اگر فایل ترکیب شده وجود دارد، آن را نامعتبر کن
            if (mergedAudioBlob) {
                mergedAudioBlob = null;
        downloadAudioBtn.disabled = true;
                updateAudioStatus();
            }
            
            // نمایش پیام موفقیت
            showNotification('تغییرات فایل صوتی با موفقیت اعمال شد');
            
            // بستن مودال
            closeAudioEditor();
            
            // بروزرسانی وضعیت دوبله
            updateAudioStatus();
            
            // بروزرسانی نمایش وضعیت فایل صوتی در زیرنویس
            updateSubtitleAudioStatus(currentEditingIndex, newFile, newBuffer);
            
        } catch (error) {
            console.error('خطا در اعمال تغییرات فایل صوتی:', error);
            showNotification('خطا در اعمال تغییرات');
        }
    }
    
    // بروزرسانی نمایش وضعیت فایل صوتی در زیرنویس
    function updateSubtitleAudioStatus(index, audioFile, audioBuffer) {
        const subtitleItem = document.querySelector(`.subtitle-item[data-index="${index}"]`);
        if (!subtitleItem) return;
        
        const audioStatus = subtitleItem.querySelector('.audio-status');
        if (!audioStatus) return;
        
        // اگر audioBuffer موجود نیست، آن را ایجاد کنیم
        if (!audioBuffer) {
            createAudioBuffer(audioFile).then(newBuffer => {
                updateSubtitleAudioStatusWithBuffer(index, audioFile, newBuffer, audioStatus, subtitleItem);
            }).catch(error => {
                console.error('خطا در پردازش فایل صوتی:', error);
            });
            return;
        }

        updateSubtitleAudioStatusWithBuffer(index, audioFile, audioBuffer, audioStatus, subtitleItem);
    }
    
    function updateSubtitleAudioStatusWithBuffer(index, audioFile, audioBuffer, audioStatus, subtitleItem) {
        
        // استخراج اطلاعات زمان زیرنویس
        const subtitle = srtContent[index];
        const timeParts = subtitle.timeCode.split(' --> ');
        const startTime = parseTimeToSeconds(timeParts[0]);
        const endTime = parseTimeToSeconds(timeParts[1]);
        const subtitleDuration = endTime - startTime;
        
        // محاسبه وضعیت تطابق زمان
        const audioDuration = audioBuffer.duration;
        const playbackRate = parseFloat(JSON.parse(localStorage.getItem('audioPlaybackRates') || '{}')[index] || 1);
        const adjustedDuration = audioDuration / playbackRate;
        
        const duration = audioDuration.toFixed(1);
        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        
        // بررسی تطابق زمان
        const timeDifference = Math.abs(adjustedDuration - subtitleDuration);
        let timeWarning = '';
        
        if (adjustedDuration > subtitleDuration + 0.5) {
            timeWarning = `⚠️ فایل صوتی ${(adjustedDuration - subtitleDuration).toFixed(1)}s طولانی‌تر است`;
        } else if (adjustedDuration < subtitleDuration - 0.5) {
            timeWarning = `⚠️ فایل صوتی ${(subtitleDuration - adjustedDuration).toFixed(1)}s کوتاه‌تر است`;
        } else {
            timeWarning = '✅ زمان‌بندی مناسب';
        }
        
        // بروزرسانی نمایش
        audioStatus.innerHTML = `
            <div class="audio-file-info">
                <div class="audio-file-name">📁 ${audioFile.name}</div>
                <div class="audio-file-details">
                    ⏱️ ${duration}s | 🔊 ${channels}ch | 📊 ${sampleRate}Hz
                </div>
                <div class="audio-time-warning ${adjustedDuration > subtitleDuration + 0.5 ? 'warning' : adjustedDuration < subtitleDuration - 0.5 ? 'error' : 'success'}">
                    ${timeWarning}
                </div>
                ${playbackRate !== 1 ? `<div class="audio-playback-rate">🔄 سرعت پخش: ${toPersianNumbers(playbackRate.toFixed(2))}x</div>` : ''}
            </div>
        `;
    }
    
    // بستن ویرایشگر
    function closeAudioEditor() {
        // توقف پخش
        stopAudioPlayback();
        
        // پاکسازی متغیرها
        currentEditingIndex = null;
        currentAudioBuffer = null;
        originalAudioBuffer = null;
        currentAudioFile = null;
        
        // پاکسازی رویدادها
        document.removeEventListener('keydown', handleAudioEditorKeydown);
        
        // بستن مودال
        audioEditorModal.classList.remove('show');
    }
    
    // پردازش کلیدهای کیبورد در ویرایشگر
    function handleAudioEditorKeydown(e) {
        if (e.key === 'Escape') {
            closeAudioEditor();
        } else if (e.key === ' ' && audioEditorModal.classList.contains('show')) {
            // پخش/توقف با فاصله
            e.preventDefault();
            togglePlayPause();
        }
    }

    // تابع پخش پیش‌نمایش فایل صوتی
    function playAudioPreview(audioFile) {
        // توقف پخش قبلی در صورت وجود
        if (window.currentAudioPreview) {
            window.currentAudioPreview.pause();
            window.currentAudioPreview = null;
        }

        const audio = new Audio();
        audio.src = URL.createObjectURL(audioFile);
        audio.volume = 0.7;
        
        audio.addEventListener('loadeddata', () => {
            audio.play().catch(error => {
                console.error('خطا در پخش پیش‌نمایش:', error);
                showNotification('خطا در پخش پیش‌نمایش صوتی.');
            });
        });

        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audio.src);
            window.currentAudioPreview = null;
        });

        audio.addEventListener('error', () => {
            showNotification('خطا در پخش فایل صوتی.');
            URL.revokeObjectURL(audio.src);
            window.currentAudioPreview = null;
        });

        window.currentAudioPreview = audio;
        showNotification('در حال پخش پیش‌نمایش...');
    }

// ثبت سرویس ورکر
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// متغیر برای کنترل نصب
let deferredPrompt;
let installButton;

// ایجاد دکمه نصب
function createInstallButton() {
  const header = document.querySelector('.header');
  if (!header) return;
  
  // افزودن دکمه نصب در کنار تغییر تم
  installButton = document.createElement('div');
  installButton.className = 'install-button';
  installButton.innerHTML = '<i class="fas fa-download"></i>';
  installButton.title = 'نصب برنامه';
  installButton.style.display = 'none';
  
  // اضافه کردن به هدر
  header.appendChild(installButton);
  
  // رویداد کلیک
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // نمایش پیام نصب
    deferredPrompt.prompt();
    
    // انتظار برای انتخاب کاربر
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // پاک کردن پرامپت
    deferredPrompt = null;
    
    // مخفی کردن دکمه
    installButton.style.display = 'none';
  });
}

// نمایش دکمه نصب
window.addEventListener('beforeinstallprompt', (e) => {
  // جلوگیری از نمایش خودکار پرامپت
  e.preventDefault();
  // ذخیره رویداد برای استفاده بعدی
  deferredPrompt = e;
  
  // نمایش دکمه نصب اختصاصی
  if (installButton) {
    installButton.style.display = 'flex';
  }
});

// پس از نصب
window.addEventListener('appinstalled', () => {
  // مخفی کردن دکمه نصب
  if (installButton) {
    installButton.style.display = 'none';
  }
  console.log('برنامه با موفقیت نصب شد');
  deferredPrompt = null;
});

// ایجاد دکمه نصب پس از بارگذاری صفحه
window.addEventListener('DOMContentLoaded', () => {
  createInstallButton();
});

// افزودن استایل دکمه نصب به صفحه
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .install-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin-right: 10px;
      background-color: #007aff;
      color: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header .right-buttons {
      display: flex;
      align-items: center;
    }
  `;
  document.head.appendChild(style);
  
  // بازسازی هدر برای نمایش بهتر دکمه‌ها
  const header = document.querySelector('.header');
  if (header) {
    const rightButtons = document.createElement('div');
    rightButtons.className = 'right-buttons';
    
    // اضافه کردن دکمه‌های موجود به قسمت راست
    const themeToggle = header.querySelector('.theme-toggle');
    if (themeToggle) {
      header.removeChild(themeToggle);
      rightButtons.appendChild(themeToggle);
    }
    
    header.appendChild(rightButtons);
  }
    });

    // Function to toggle edit mode for a subtitle's time code
    function toggleTimeEdit(subtitleItem, index) {
        const timeElement = subtitleItem.querySelector('.subtitle-time');
        const timeEditButton = subtitleItem.querySelector('.time-edit-btn');

        if (!timeElement || !timeEditButton) {
            console.error("Time element or edit button not found for index:", index, subtitleItem);
            return;
        }

        const isEditing = timeElement.hasAttribute('data-editing') && timeElement.getAttribute('data-editing') === 'true';

        if (isEditing) { // SAVE action
            const timeInput = timeElement.querySelector('input.time-edit-input');
            if (!timeInput) { // Should not happen if isEditing is true, but as a fallback
                timeElement.removeAttribute('data-editing');
                timeElement.classList.remove('editing');
                timeEditButton.innerHTML = '<i class="fas fa-clock"></i>';
                timeEditButton.title = 'ویرایش زمان';
                timeEditButton.classList.remove('saving');
                return;
            }

            const newTimeCode = timeInput.value.trim();
            // Keep a reference to the original time code for reversion on invalid input
            const originalTimeCodeBeforeEditAttempt = srtContent[index].timeCode;


            if (!validateTimeCode(newTimeCode)) {
                showNotification('فرمت زمان نامعتبر است. لطفاً از فرمت HH:MM:SS,mmm --> HH:MM:SS,mmm استفاده کنید');
                // Revert the input field to the original value and keep it in edit mode
                timeInput.value = originalTimeCodeBeforeEditAttempt;
                timeInput.focus();
                timeInput.select();
                return; // Do not exit edit mode, let user correct or click save again.
            }

            // If validation passes, save the new time code
            srtContent[index].timeCode = newTimeCode;
            if (translatedContent[index]) { // Also update in translatedContent
                translatedContent[index].timeCode = newTimeCode;
            }

            timeElement.innerHTML = newTimeCode; // Display new time
            timeElement.removeAttribute('data-editing');
            timeElement.classList.remove('editing');

            timeEditButton.innerHTML = '<i class="fas fa-clock"></i>';
            timeEditButton.title = 'ویرایش زمان';
            timeEditButton.classList.remove('saving');

            updateAudioTimingWarning(index);
            saveProjectData();
            updateSubtitleDisplay(); // Update display for all relevant items
            showNotification('زمان‌بندی ذخیره شد');

        } else { // ENTER EDIT MODE
            timeElement.setAttribute('data-editing', 'true');
            timeElement.classList.add('editing');

            const currentTimeCode = srtContent[index].timeCode;
            timeElement.innerHTML = `<input type="text" class="time-edit-input" value="${currentTimeCode}">`;
            
            const input = timeElement.querySelector('input.time-edit-input');
            if (input) {
                input.focus();
                input.select();

                // Store original value for escape
                input.setAttribute('data-original-value', currentTimeCode);

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        toggleTimeEdit(subtitleItem, index); // Trigger save by calling itself
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        timeElement.innerHTML = input.getAttribute('data-original-value'); // Revert to original
                        timeElement.removeAttribute('data-editing');
                        timeElement.classList.remove('editing');
                        timeEditButton.innerHTML = '<i class="fas fa-clock"></i>';
                        timeEditButton.title = 'ویرایش زمان';
                        timeEditButton.classList.remove('saving');
                    }
                });
            }

            timeEditButton.innerHTML = '<i class="fas fa-save"></i>';
            timeEditButton.title = 'ذخیره زمان';
            timeEditButton.classList.add('saving');
            
            // showNotification('در حال ویرایش زمان. برای ذخیره، کلیک کنید یا Enter بزنید.');
        }
    }
    
    // Function to validate time code format
    function validateTimeCode(timeCode) {
        // Simple validation for now: HH:MM:SS,mmm --> HH:MM:SS,mmm
        const timeCodeRegex = /^\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}$/;
        if (!timeCodeRegex.test(timeCode)) return false;
        
        // Additional validation: end time should be greater than start time
        const parts = timeCode.split(' --> ');
        const startTime = parseTimeToSeconds(parts[0]);
        const endTime = parseTimeToSeconds(parts[1]);
        
        return endTime > startTime;
    }
    
    // Function to update audio timing warnings after time code changes
    function updateAudioTimingWarning(index) {
        // Check if this subtitle has audio
        if (!audioFiles[index]) return;
        
        // Update the subtitle's audio status
        const subtitleItem = document.querySelector(`.subtitle-item[data-index="${index}"]`);
        if (!subtitleItem) return;
        
        const audioFile = audioFiles[index];
        updateSubtitleAudioStatus(index, audioFile);
        
        // If merged audio exists, invalidate it as timing has changed
        if (mergedAudioBlob) {
            mergedAudioBlob = null;
            downloadAudioBtn.disabled = true;
            updateAudioStatus();
            showNotification('زمان‌بندی تغییر کرده است. لطفاً فایل‌های صوتی را مجدداً ترکیب کنید.');
        }
    }

    // Event delegation for original subtitles
    originalSubtitles.addEventListener('click', function(e) {
        const target = e.target;
        const subtitleItem = target.closest('.subtitle-item');
        if (!subtitleItem) return;

        // Handle time edit button clicks in original subtitles
        if (target.classList.contains('time-edit-btn') || target.closest('.time-edit-btn')) {
            // Find index for original subtitles if not directly on button
            const index = parseInt(subtitleItem.dataset.index);
            if (isNaN(index)) { // Fallback if data-index wasn't on subtitleItem but on button
                 const buttonIndex = parseInt(target.closest('.time-edit-btn').dataset.index);
                 if(!isNaN(buttonIndex)) {
                      // This case should not happen if data-index is on subtitle-item
                 }
            }
             if (!isNaN(index)) {
                toggleTimeEdit(subtitleItem, index);
            }
        }
    });

    // افزودن ابزار ویرایش گروهی زمان
    const subtitleContainersElement = document.querySelector('.subtitle-containers');

    if (subtitleContainersElement && subtitleContainersElement.parentNode) {
        const timingToolsContainer = document.createElement('div');
        timingToolsContainer.className = 'timing-tools-container';
        timingToolsContainer.innerHTML = `
            <div class="timing-tools">
                <h3>ابزارهای تنظیم زمان‌بندی</h3>
                <div class="timing-input-group">
                    <label for="timeShiftAmount">جابجایی زمانی (به ثانیه):</label>
                    <input type="number" id="timeShiftAmount" step="0.1" value="0">
                </div>
                <div class="timing-buttons">
                    <button id="shiftForwardBtn" class="timing-btn" title="افزایش زمان همه زیرنویس‌ها">
                        <i class="fas fa-fast-forward"></i> جلو بردن
                    </button>
                    <button id="shiftBackwardBtn" class="timing-btn" title="کاهش زمان همه زیرنویس‌ها">
                        <i class="fas fa-fast-backward"></i> عقب بردن
                    </button>
                    <button id="syncToAudioBtn" class="timing-btn" title="تنظیم خودکار زمان‌بندی زیرنویس‌ها با فایل‌های صوتی">
                        <i class="fas fa-sync"></i> تنظیم با صدا
                    </button>
                </div>
            </div>
            <button id="toggleTimingTools" class="toggle-timing-tools">
                <i class="fas fa-clock"></i> ابزارهای زمان‌بندی
            </button>
        `;
        
        // Insert the timing tools container *after* subtitle-containers
        subtitleContainersElement.parentNode.insertBefore(timingToolsContainer, subtitleContainersElement.nextSibling);
        
        const timingTools = timingToolsContainer.querySelector('.timing-tools');
        timingTools.style.display = 'none'; // Initially hidden
        
        const toggleTimingTools = timingToolsContainer.querySelector('#toggleTimingTools');
        toggleTimingTools.addEventListener('click', () => {
            const isVisible = timingTools.style.display !== 'none';
            timingTools.style.display = isVisible ? 'none' : 'block';
            toggleTimingTools.innerHTML = isVisible ? 
                '<i class="fas fa-clock"></i> ابزارهای زمان‌بندی' : 
                '<i class="fas fa-times"></i> بستن';
        });
        
        const shiftForwardBtn = timingToolsContainer.querySelector('#shiftForwardBtn');
        const shiftBackwardBtn = timingToolsContainer.querySelector('#shiftBackwardBtn');
        const syncToAudioBtn = timingToolsContainer.querySelector('#syncToAudioBtn');
        const timeShiftAmountInput = timingToolsContainer.querySelector('#timeShiftAmount');
        
        shiftForwardBtn.addEventListener('click', () => {
            const amount = parseFloat(timeShiftAmountInput.value);
            if (isNaN(amount)) {
                showNotification('لطفاً یک مقدار عددی معتبر وارد کنید');
                return;
            }
            shiftAllSubtitles(amount);
        });
        
        shiftBackwardBtn.addEventListener('click', () => {
            const amount = parseFloat(timeShiftAmountInput.value);
            if (isNaN(amount)) {
                showNotification('لطفاً یک مقدار عددی معتبر وارد کنید');
                return;
            }
            shiftAllSubtitles(-amount);
        });
        
        syncToAudioBtn.addEventListener('click', () => {
            syncSubtitlesToAudio();
        });
    } else {
        console.error('محل قرارگیری ابزار تنظیم زمان (.subtitle-containers) یافت نشد. ابزارهای گروهی زمان بارگذاری نشدند.');
    }
    
    // تابع تغییر زمان همه زیرنویس‌ها
    function shiftAllSubtitles(secondsToShift) {
        if (!srtContent.length) {
            showNotification('هیچ زیرنویسی برای تغییر زمان وجود ندارد');
            return;
        }
        
        if (secondsToShift === 0) {
            showNotification('مقدار تغییر زمان نمی‌تواند صفر باشد');
            return;
        }
        
        // بررسی اینکه تغییر زمان باعث زمان منفی نشود
        let hasNegativeTime = false;
        for (const subtitle of srtContent) {
            const parts = subtitle.timeCode.split(' --> ');
            const startTime = parseTimeToSeconds(parts[0]);
            
            if (startTime + secondsToShift < 0) {
                hasNegativeTime = true;
                break;
            }
        }
        
        if (hasNegativeTime) {
            showNotification('تغییر زمان باعث ایجاد زمان منفی می‌شود و امکان‌پذیر نیست');
            return;
        }
        
        // تغییر زمان برای همه زیرنویس‌ها
        for (let i = 0; i < srtContent.length; i++) {
            const subtitle = srtContent[i];
            const parts = subtitle.timeCode.split(' --> ');
            
            // تبدیل زمان‌ها به ثانیه، اعمال تغییر، و تبدیل مجدد به فرمت زمانی
            const startTime = parseTimeToSeconds(parts[0]) + secondsToShift;
            const endTime = parseTimeToSeconds(parts[1]) + secondsToShift;
            
            const newTimeCode = `${formatTimeCode(startTime)} --> ${formatTimeCode(endTime)}`;
            srtContent[i].timeCode = newTimeCode;
            
            // بروزرسانی زمان در ترجمه‌ها هم اگر وجود دارد
            if (translatedContent[i]) {
                translatedContent[i].timeCode = newTimeCode;
            }
        }
        
        // بروزرسانی نمایش زیرنویس‌ها
        updateSubtitleDisplay();
        
        // ذخیره تغییرات
        saveProjectData();
        
        // اگر فایل صوتی ترکیب شده وجود دارد، آن را نامعتبر کن
        if (mergedAudioBlob) {
            mergedAudioBlob = null;
            downloadAudioBtn.disabled = true;
            updateAudioStatus();
        }
        
        showNotification(`زمان‌بندی همه زیرنویس‌ها ${secondsToShift > 0 ? toPersianNumbers(secondsToShift) + ' ثانیه جلو' : toPersianNumbers(Math.abs(secondsToShift)) + ' ثانیه عقب'} برده شد`);
    }
    
    // تبدیل ثانیه به فرمت زمانی SRT
    function formatTimeCode(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor((totalSeconds * 1000) % 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }
    
    // بروزرسانی نمایش زیرنویس‌ها پس از تغییر زمان
    function updateSubtitleDisplay() {
        // بروزرسانی نمایش زیرنویس‌های اصلی
        const originalItems = originalSubtitles.querySelectorAll('.subtitle-item');
        originalItems.forEach((item, index) => {
            if (index < srtContent.length) {
                const timeElement = item.querySelector('.subtitle-time');
                if (timeElement) {
                    timeElement.textContent = srtContent[index].timeCode;
                }
            }
        });
        
        // بروزرسانی نمایش زیرنویس‌های ترجمه شده
        const translatedItems = translatedSubtitles.querySelectorAll('.subtitle-item');
        translatedItems.forEach((item, index) => {
            if (index < srtContent.length) {
                const timeElement = item.querySelector('.subtitle-time');
                if (timeElement) {
                    timeElement.textContent = srtContent[index].timeCode;
                }
            }
        });
        
        // بروزرسانی هشدارهای زمان‌بندی صوتی
        for (const indexStr in audioFiles) {
            const index = parseInt(indexStr);
            updateAudioTimingWarning(index);
        }
    }
    
    // تنظیم خودکار زمان‌بندی زیرنویس‌ها با فایل‌های صوتی
    function syncSubtitlesToAudio() {
        // بررسی وجود فایل‌های صوتی
        const audioKeys = Object.keys(audioFiles);
        if (audioKeys.length === 0) {
            showNotification('هیچ فایل صوتی برای تنظیم زمان‌بندی وجود ندارد');
            return;
        }
        
        if (confirm('این عملیات زمان‌بندی زیرنویس‌ها را بر اساس مدت زمان فایل‌های صوتی تنظیم می‌کند. ادامه می‌دهید؟')) {
            // نمایش پیام در حال پردازش
            showNotification('در حال تنظیم زمان‌بندی زیرنویس‌ها...');
            
            // ایجاد آرایه وعده‌ها برای پردازش فایل‌های صوتی
            const promises = [];
            const audioDurations = {};
            
            // اگر AudioContext قبلاً ایجاد شده آن را بازنشانی کنیم
            if (audioContext) {
                audioContext.close();
            }
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // محاسبه مدت زمان فایل‌های صوتی
            for (const indexStr of audioKeys) {
                const index = parseInt(indexStr);
                const audioFile = audioFiles[index];
                
                const promise = new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const arrayBuffer = e.target.result;
                        audioContext.decodeAudioData(arrayBuffer).then((buffer) => {
                            // ذخیره مدت زمان فایل صوتی
                            audioDurations[index] = buffer.duration;
                            resolve();
                        }).catch(() => {
                            // در صورت خطا، فرض کنیم فایل خراب است
                            resolve();
                        });
                    };
                    reader.readAsArrayBuffer(audioFile);
                });
                
                promises.push(promise);
            }
            
            // پس از محاسبه همه مدت زمان‌ها
            Promise.all(promises).then(() => {
                // بررسی داده‌های جمع‌آوری شده
                if (Object.keys(audioDurations).length === 0) {
                    showNotification('خطا در خواندن فایل‌های صوتی');
                    return;
                }
                
                // گام اول: ایجاد یک کپی از زیرنویس‌ها برای تنظیم زمان
                const newTimings = [...srtContent].map(subtitle => ({ 
                    ...subtitle, 
                    originalTimeCode: subtitle.timeCode 
                }));
                
                // گام دوم: تنظیم زمان‌بندی زیرنویس‌هایی که فایل صوتی دارند
                // و محاسبه تغییرات زمانی آنها نسبت به قبل
                const timeShifts = [];
                let totalTimeShift = 0;
                
                // ابتدا بیاییم زمان‌بندی زیرنویس‌هایی که صدا دارند را تنظیم کنیم
                for (const indexStr in audioDurations) {
                    const index = parseInt(indexStr);
                    const duration = audioDurations[index];
                    
                    if (index < newTimings.length) {
                        const subtitle = newTimings[index];
                        const parts = subtitle.originalTimeCode.split(' --> ');
                        
                        if (parts.length === 2) {
                            const oldStartTime = parseTimeToSeconds(parts[0]);
                            const oldEndTime = parseTimeToSeconds(parts[1]);
                            const oldDuration = oldEndTime - oldStartTime;
                            
                            // اگر اختلاف زمانی بیش از 20% باشد، تنظیم کنیم
                            if (Math.abs(duration - oldDuration) / oldDuration > 0.2) {
                                // تنظیم زمان پایان بر اساس مدت زمان صوتی
                                const newEndTime = oldStartTime + duration;
                                
                                // ایجاد کد زمانی جدید
                                const newTimeCode = `${parts[0]} --> ${formatTimeCode(newEndTime)}`;
                                newTimings[index].timeCode = newTimeCode;
                                
                                // محاسبه تغییر زمانی
                                const timeShift = duration - oldDuration;
                                timeShifts.push({ index, shift: timeShift });
                                totalTimeShift += timeShift;
                            }
                        }
                    }
                }
                
                // گام سوم: اعمال تغییرات به زیرنویس‌های بعدی
                // اگر تغییراتی داشتیم
                if (timeShifts.length > 0) {
                    // مرتب‌سازی بر اساس ایندکس
                    timeShifts.sort((a, b) => a.index - b.index);
                    
                    let currentShift = 0;
                    
                    for (let i = 0; i < newTimings.length; i++) {
                        // اگر این زیرنویس قبلاً تنظیم شده باشد، آن را نادیده می‌گیریم
                        if (audioDurations[i] !== undefined) {
                            // بروزرسانی مقدار تغییر کلی
                            for (const shift of timeShifts) {
                                if (shift.index === i) {
                                    currentShift += shift.shift;
                                    break;
                                }
                            }
                            continue;
                        }
                        
                        // اعمال تغییر به زیرنویس‌های بعدی
                        if (currentShift !== 0 && i > timeShifts[0].index) {
                            const parts = newTimings[i].originalTimeCode.split(' --> ');
                            if (parts.length === 2) {
                                const startTime = parseTimeToSeconds(parts[0]) + currentShift;
                                const endTime = parseTimeToSeconds(parts[1]) + currentShift;
                                
                                const newTimeCode = `${formatTimeCode(startTime)} --> ${formatTimeCode(endTime)}`;
                                newTimings[i].timeCode = newTimeCode;
                            }
                        }
                    }
                    
                    // گام چهارم: اعمال تغییرات به زیرنویس‌های اصلی و ترجمه شده
                    for (let i = 0; i < newTimings.length; i++) {
                        const newTimeCode = newTimings[i].timeCode;
                        
                        // اعمال به زیرنویس اصلی
                        srtContent[i].timeCode = newTimeCode;
                        
                        // اعمال به ترجمه اگر وجود دارد
                        if (translatedContent[i]) {
                            translatedContent[i].timeCode = newTimeCode;
                        }
                    }
                    
                    // بروزرسانی نمایش زیرنویس‌ها
                    updateSubtitleDisplay();
                    
                    // ذخیره تغییرات
                    saveProjectData();
                    
                    // اگر فایل صوتی ترکیب شده وجود دارد، آن را نامعتبر کن
                    if (mergedAudioBlob) {
                        mergedAudioBlob = null;
                        downloadAudioBtn.disabled = true;
                        updateAudioStatus();
                    }
                    
                    showNotification(`زمان‌بندی ${toPersianNumbers(timeShifts.length)} زیرنویس با فایل‌های صوتی تنظیم شد`);
                } else {
                    showNotification('اختلاف زمانی معناداری بین زیرنویس‌ها و فایل‌های صوتی وجود ندارد');
                }
            }).catch(error => {
                console.error('خطا در تنظیم زمان‌بندی:', error);
                showNotification('خطا در تنظیم زمان‌بندی زیرنویس‌ها');
            }).finally(() => {
                // بستن AudioContext
                if (audioContext) {
                    audioContext.close();
                }
            });
        }
    }

    // Make Audio Dubbing section collapsible
    const audioDubbingSection = document.querySelector('.audio-dubbing-section');
    if (audioDubbingSection) {
        const h3Title = audioDubbingSection.querySelector('h3');
        if (h3Title) {
            // Create a toggle icon element
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'section-toggle-icon fas fa-chevron-down'; // Initial state: collapsed, shows "open" icon
            toggleIcon.style.marginLeft = '10px'; // Space between text and icon
            toggleIcon.style.fontSize = '0.9em'; // Slightly smaller icon
            h3Title.style.display = 'flex'; 
            h3Title.style.alignItems = 'center';
            h3Title.style.justifyContent = 'center'; // Keep existing center alignment for text+icon block

            // Append the icon to the h3 title
            h3Title.appendChild(toggleIcon);
            h3Title.style.cursor = 'pointer'; // Make the whole h3 clickable

            // Create a wrapper for the content that will be collapsed
            const collapsibleContentWrapper = document.createElement('div');
            collapsibleContentWrapper.className = 'audio-dubbing-collapsible-content';
            collapsibleContentWrapper.style.display = 'none'; // Initially hidden

            // Move all direct children of audioDubbingSection (except h3) into the wrapper
            // Convert HTMLCollection to array to avoid issues while moving nodes
            const childrenToMove = Array.from(audioDubbingSection.children);
            childrenToMove.forEach(child => {
                if (child !== h3Title) {
                    collapsibleContentWrapper.appendChild(child);
                }
            });

            // Append the wrapper back to the section (after the h3)
            audioDubbingSection.appendChild(collapsibleContentWrapper);

            // Add click event listener to the h3 title
            h3Title.addEventListener('click', () => {
                const isHidden = collapsibleContentWrapper.style.display === 'none';
                collapsibleContentWrapper.style.display = isHidden ? 'block' : 'none';
                toggleIcon.className = `section-toggle-icon fas ${isHidden ? 'fa-chevron-up' : 'fa-chevron-down'}`;
                 // Adjust icon styles after class change if needed
                toggleIcon.style.marginLeft = '10px'; 
                toggleIcon.style.fontSize = '0.9em'; 
            });
        } else {
            console.error('H3 title not found in .audio-dubbing-section for collapsible feature.');
        }
    } else {
        console.error('.audio-dubbing-section not found in the document for collapsible feature.');
    }

}); // End of DOMContentLoaded
