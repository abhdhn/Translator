document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const connectionStatus = document.getElementById('connectionStatus');
    const connectApiBtn = document.getElementById('connectApi');
    const modelSelect = document.getElementById('modelSelect');
    const modelSearch = document.getElementById('modelSearch');
    const confirmModelBtn = document.getElementById('confirmModel');
    const toneSelect = document.getElementById('toneSelect');
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
    
    // متغیرهای مربوط به محاسبه پیشرفت و زمان
    let translationStartTime;
    let translationTimes = [];
    let avgTranslationTime = 0;
    
    // بهینه‌سازی اندازه صفحه در زمان لود
    adjustUIForScreenSize();
    window.addEventListener('resize', adjustUIForScreenSize);
    window.addEventListener('orientationchange', adjustUIForScreenSize);
    
    // Set saved API key if available
    if (apiKey) {
        apiKeyInput.value = apiKey;
        testApiConnection(apiKey);
    }
    
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
    
    // Event delegation for edit and retranslate buttons
    translatedSubtitles.addEventListener('click', function(e) {
        // Handle edit button clicks
        if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
            const subtitleItem = e.target.closest('.subtitle-item');
            const subtitleText = subtitleItem.querySelector('.subtitle-text');
            const subtitleIndex = parseInt(subtitleItem.dataset.index);
            
            toggleEdit(subtitleText, subtitleIndex);
        }
        
        // Handle retranslate button clicks
        if (e.target.classList.contains('retranslate-btn') || e.target.closest('.retranslate-btn')) {
            const subtitleItem = e.target.closest('.subtitle-item');
            const subtitleIndex = parseInt(subtitleItem.dataset.index);
            
            retranslateSubtitle(subtitleIndex);
        }
    });
    
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
                showNotification('اتصال API موفقیت‌آمیز بود');
                return;
            }
            
            // اگر اتصال موفق نبود
            connectionStatus.classList.add('disconnected');
            isConnected = false;
            showNotification('اتصال API ناموفق بود. لطفاً کلید API معتبر OpenRouter وارد کنید');
            
        } catch (error) {
            console.error('API connection error:', error);
            connectionStatus.classList.add('disconnected');
            isConnected = false;
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
        if (!file) return;
        
        if (file.name.endsWith('.srt')) {
            fileNameDisplay.textContent = file.name;
            originalFileName = file.name.replace('.srt', '');
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                parseSRT(content);
            };
            reader.readAsText(file);
        } else {
            showNotification('لطفاً یک فایل SRT انتخاب کنید');
            srtFileInput.value = '';
            fileNameDisplay.textContent = 'فایلی انتخاب نشده';
        }
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
                
                if (editBtn) editBtn.disabled = false;
                if (retranslateBtn) retranslateBtn.disabled = false;
            }
            
            // بروزرسانی شمارشگر خطوط ترجمه شده
            updateSubtitleCounters();
            
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
        let prompt;
        switch (tone) {
            case 'formal':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن رسمی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'informal':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن غیر رسمی و محاوره‌ای انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'professional':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن حرفه‌ای انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'scientific':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن علمی و تخصصی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'informative':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن اطلاعاتی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'conversational':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن گفتاری و روزمره انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            case 'movie':
                prompt = `ترجمه زیرنویس زیر را به فارسی با لحن حرفه‌ای مخصوص فیلم و سریال انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
                break;
            default:
                prompt = `ترجمه زیرنویس زیر را به فارسی انجام بده. فقط متن ترجمه شده را برگردان: "${text}"`;
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
                        { role: 'system', content: 'شما یک مترجم حرفه‌ای هستید که زیرنویس‌ها را به فارسی ترجمه می‌کند.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
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
        
        // بازنشانی وضعیت دکمه‌ها
        translateBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        clearBtn.disabled = true;
        saveBtn.disabled = true;
        
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
        
        // بازنشانی وضعیت دکمه‌ها
        translateBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        clearBtn.disabled = true;
        saveBtn.disabled = true;
        
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
        
        // Create SRT content
        let srtData = '';
        translatedContent.forEach(subtitle => {
            srtData += subtitle.index + '\n';
            srtData += subtitle.timeCode + '\n';
            srtData += subtitle.text + '\n\n';
        });
        
        // Create and download the file
        const blob = new Blob([srtData], { type: 'text/srt;charset=utf-8' });
        const tone = toneSelect.options[toneSelect.selectedIndex].text;
        
        // اضافه کردن پسوند ناقص اگر ترجمه کامل نشده باشد
        let fileName = '';
        if (isTranslating && pauseTranslation) {
            fileName = `${originalFileName}_fa_${tone}_ناقص.srt`;
        } else {
            fileName = `${originalFileName}_fa_${tone}.srt`;
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
        
        const subtitleText = document.createElement('div');
        subtitleText.className = 'subtitle-text placeholder';
        subtitleText.textContent = 'در حال ترجمه...';
        
        const subtitleActions = document.createElement('div');
        subtitleActions.className = 'subtitle-actions';
        subtitleActions.innerHTML = `
            <button class="action-btn edit-btn" disabled>
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn retranslate-btn" disabled>
                <i class="fas fa-sync"></i>
            </button>
        `;
        
        subtitleItem.appendChild(subtitleText);
        subtitleItem.appendChild(subtitleActions);
        
        translatedSubtitles.appendChild(subtitleItem);
    }
}); 