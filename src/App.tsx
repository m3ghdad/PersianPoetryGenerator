import { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ButtonStack } from './components/ButtonStack';
import { SettingsButton } from './components/SettingsButton';
import { AuthSheet } from './components/AuthSheet';
import { DraggableProfileSheet } from './components/DraggableProfileSheet';
import { DraggableFavoritesSheet } from './components/DraggableFavoritesSheet';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';

interface Poem {
  id: number;
  title: string;
  text: string;
  htmlText: string;
  poet: {
    id: number;
    name: string;
    fullName: string;
  };
}

// Mock data for fallback when API fails
const mockPoemsFa: Poem[] = [
  {
    id: 1,
    title: "غزل شماره ۱",
    text: "الا یا ایها الساقی ادر کاسا و ناولها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها",
    htmlText: "الا یا ایها الساقی ادر کاسا و ناولها<br/>که عشق آسان نمود اول ولی افتاد مشکل‌ها",
    poet: {
      id: 1,
      name: "حافظ",
      fullName: "خواجه شمس‌الدین محمد حافظ شیرازی"
    }
  },
  {
    id: 2,
    title: "رباعی",
    text: "این کوزه چو من عاشق زاری بوده است\nدر بند سر زلف نگاری بوده است\nاین دسته که بر گردن او می‌بینی\nدستی است که بر گردن یاری بوده است",
    htmlText: "این کوزه چو من عاشق زاری بوده است<br/>در بند سر زلف نگاری بوده است<br/>این دسته که بر گردن او می‌بینی<br/>دستی است که بر گردن یاری بوده است",
    poet: {
      id: 2,
      name: "عمر خیام",
      fullName: "غیاث‌الدین ابوالفتح عمر بن ابراهیم خیام نیشابوری"
    }
  },
  {
    id: 3,
    title: "غزل",
    text: "بنی آدم اعضای یک پیکرند\nکه در آفرینش ز یک گوهرند\nچو عضوی به درد آورد روزگار\nدگر عضوها را نماند قرار",
    htmlText: "بنی آدم اعضای یک پیکرند<br/>که در آفرینش ز یک گوهرند<br/>چو عضوی به درد آورد روزگار<br/>دگر عضوها را نماند قرار",
    poet: {
      id: 3,
      name: "سعدی",
      fullName: "ابومحمد مصلح‌الدین بن عبدالله شیرازی"
    }
  },
  {
    id: 4,
    title: "مثنوی معنوی",
    text: "بشنو از نی چون حکایت می‌کند\nاز جدایی‌ها شکایت می‌کند\nکز نیستان تا مرا ببریده‌اند\nدر نفیرم مرد و زن نالیده‌اند",
    htmlText: "بشنو از نی چون حکایت می‌کند<br/>از جدایی‌ها شکایت می‌کند<br/>کز نیستان تا مرا ببریده‌اند<br/>در نفیرم مرد و زن نالیده‌اند",
    poet: {
      id: 5,
      name: "مولانا",
      fullName: "جلال‌الدین محمد بلخی"
    }
  },
  {
    id: 5,
    title: "شاهنامه",
    text: "بسی رنج بردم در این سال سی\nعجم زنده کردم بدین پارسی\nبه نزدیک ایرانیان پهلوان\nمن اولم و جاودان بادمان",
    htmlText: "بسی رنج بردم در این سال سی<br/>عجم زنده کردم بدین پارسی<br/>به نزدیک ایرانیان پهلوان<br/>من اولم و جاودان بادمان",
    poet: {
      id: 4,
      name: "فردوسی",
      fullName: "ابوالقاسم فردوسی طوسی"
    }
  },
  {
    id: 6,
    title: "خسرو و شیرین",
    text: "عشق است که در دل فروزد شرار\nعشق است که آرد به جان قرار\nگر عشق نباشد کسی زنده نیست\nگر عشق نباشد کسی بنده نیست",
    htmlText: "عشق است که در دل فروزد شرار<br/>عشق است که آرد به جان قرار<br/>گر عشق نباشد کسی زنده نیست<br/>گر عشق نباشد کسی بنده نیست",
    poet: {
      id: 6,
      name: "نظامی",
      fullName: "نظامی گنجوی"
    }
  }
];

// English translated poems for demo
const mockPoemsEn: Poem[] = [
  {
    id: 101,
    title: "Ghazal No. 1",
    text: "Come, O cup-bearer, bring wine and offer it\nFor love seemed easy at first, but difficulties arose",
    htmlText: "Come, O cup-bearer, bring wine and offer it<br/>For love seemed easy at first, but difficulties arose",
    poet: {
      id: 1,
      name: "Hafez",
      fullName: "Khwaja Shams-ud-Din Muhammad Hafez-e Shirazi"
    }
  },
  {
    id: 102,
    title: "Quatrain",
    text: "This jug, like me, was once a lover in despair\nCaught in the bonds of some beloved's hair\nThis handle that you see upon its neck\nWas once an arm around a lover fair",
    htmlText: "This jug, like me, was once a lover in despair<br/>Caught in the bonds of some beloved's hair<br/>This handle that you see upon its neck<br/>Was once an arm around a lover fair",
    poet: {
      id: 2,
      name: "Omar Khayyam",
      fullName: "Ghiyath al-Din Abu'l-Fath Umar ibn Ibrahim al-Khayyam al-Nishapuri"
    }
  },
  {
    id: 103,
    title: "Ghazal",
    text: "Human beings are members of a whole\nIn creation of one essence and soul\nIf a member is afflicted with pain\nOther members uneasy will remain",
    htmlText: "Human beings are members of a whole<br/>In creation of one essence and soul<br/>If a member is afflicted with pain<br/>Other members uneasy will remain",
    poet: {
      id: 3,
      name: "Saadi",
      fullName: "Abu-Muhammad Muslih al-Din bin Abdallah Shirazi"
    }
  },
  {
    id: 104,
    title: "Masnavi",
    text: "Listen to the reed flute, how it tells a tale\nComplaining of separations, saying\nEver since I was parted from the reed-bed\nMy lament has caused men and women to moan",
    htmlText: "Listen to the reed flute, how it tells a tale<br/>Complaining of separations, saying<br/>Ever since I was parted from the reed-bed<br/>My lament has caused men and women to moan",
    poet: {
      id: 5,
      name: "Rumi",
      fullName: "Jalal al-Din Muhammad Balkhi"
    }
  },
  {
    id: 105,
    title: "Shahnameh",
    text: "I suffered much hardship in these thirty years\nI revived the Persians with this Persian\nAmong the Iranians, I am a champion\nI am first, and may I be eternal",
    htmlText: "I suffered much hardship in these thirty years<br/>I revived the Persians with this Persian<br/>Among the Iranians, I am a champion<br/>I am first, and may I be eternal",
    poet: {
      id: 4,
      name: "Ferdowsi",
      fullName: "Abul-Qasem Ferdowsi Tusi"
    }
  },
  {
    id: 106,
    title: "Khosrow and Shirin",
    text: "It is love that kindles fire in the heart\nIt is love that brings peace to the soul\nIf there is no love, no one is alive\nIf there is no love, no one is bound",
    htmlText: "It is love that kindles fire in the heart<br/>It is love that brings peace to the soul<br/>If there is no love, no one is alive<br/>If there is no love, no one is bound",
    poet: {
      id: 6,
      name: "Nezami",
      fullName: "Nezami Ganjavi"
    }
  }
];

// Simple border component
function SimpleBorder() {
  return (
    <div className="absolute inset-4 pointer-events-none">
      <div className="w-full h-full rounded-lg border border-white/20"></div>
    </div>
  );
}

function PoemCard({ poem, isActive, currentIndex, cardIndex }: { 
  poem: Poem; 
  isActive: boolean; 
  currentIndex: number;
  cardIndex: number;
}) {
  const [fontSize, setFontSize] = useState('text-2xl');
  const contentRef = useRef<HTMLDivElement>(null);
  const { isRTL } = useLanguage();

  // Calculate optimal font size to fit content
  useEffect(() => {
    if (!contentRef.current) return;

    const calculateOptimalSize = () => {
      const container = contentRef.current;
      if (!container) return;

      // Available height for poem content (leaving space for poet name at top and padding)
      const availableHeight = window.innerHeight - 200; // Reserve space for poet name at top and padding
      const textLines = poem.text.split('\n').length;
      
      // Calculate font size based on content length and available space
      let size = 'text-3xl';
      if (textLines > 8 || poem.text.length > 400) {
        size = 'text-xl';
      } else if (textLines > 6 || poem.text.length > 300) {
        size = 'text-2xl';
      } else if (textLines > 4 || poem.text.length > 200) {
        size = 'text-2xl';
      }
      
      setFontSize(size);
    };

    calculateOptimalSize();
    window.addEventListener('resize', calculateOptimalSize);
    return () => window.removeEventListener('resize', calculateOptimalSize);
  }, [poem.text]);

  // Calculate card position based on current index
  const getCardTransform = () => {
    const offset = cardIndex - currentIndex;
    if (offset === 0) return 'translateY(0%)';
    if (offset < 0) return 'translateY(-100%)';
    return 'translateY(100%)';
  };

  return (
    <div 
      className="absolute inset-0 w-full h-screen flex flex-col bg-background transition-transform duration-300 ease-out"
      style={{
        transform: getCardTransform(),
        zIndex: isActive ? 10 : 1
      }}
    >
      {/* Author name at the top */}
      <div 
        className="relative z-10 w-full text-center px-6 md:px-8 flex-shrink-0"
        style={{
          paddingTop: `max(2rem, env(safe-area-inset-top) + 1rem)` // Ensure it's below notch/status bar
        }}
      >
        <div className="text-foreground/70 text-lg md:text-xl lg:text-2xl font-medium transition-all duration-500" dir={isRTL ? "rtl" : "ltr"}>
          {poem.poet.name}
        </div>
      </div>

      {/* Poem content in the center */}
      <div className="relative z-10 max-w-4xl w-full flex-1 flex flex-col justify-center text-center px-6 md:px-8 self-center px-[24px] py-[0px]">
        <div 
          ref={contentRef}
          className={`text-foreground ${fontSize} leading-relaxed font-light tracking-wide transition-all duration-500 overflow-y-auto scrollbar-hide`}
          dir={isRTL ? "rtl" : "ltr"}
          style={{ 
            fontFamily: isRTL ? 'system-ui, -apple-system, sans-serif' : 'Georgia, "Times New Roman", serif',
            lineHeight: '1.8',
            maxHeight: 'calc(100vh - 200px)' // Simplified calculation
          }}
          dangerouslySetInnerHTML={{ __html: poem.htmlText || poem.text.replace(/\n/g, '<br/>') }}
        />
      </div>

      {/* Bottom spacer to ensure content doesn't get hidden behind home indicator */}
      <div 
        className="flex-shrink-0"
        style={{
          paddingBottom: `max(2rem, env(safe-area-inset-bottom) + 1rem)` // Ensure space above home indicator
        }}
      />
      

    </div>
  );
}

function AppContent() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [usedPoemIds, setUsedPoemIds] = useState<Set<number>>(new Set());
  const [usingMockData, setUsingMockData] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sheet states
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [favoritesSheetOpen, setFavoritesSheetOpen] = useState(false);
  
  const { user, refreshSession } = useAuth();
  const { language, t, isRTL } = useLanguage();
  
  // Touch handling state
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const swipeCountRef = useRef(0);

  // Shuffle array utility
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Circuit breaker state
  const [apiCircuitOpen, setApiCircuitOpen] = useState(false);
  const [lastApiFailureTime, setLastApiFailureTime] = useState<number>(0);
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout>();

  // Reset circuit breaker after 30 seconds (shorter recovery time)
  const resetCircuitBreaker = useCallback(() => {
    if (circuitBreakerTimeoutRef.current) {
      clearTimeout(circuitBreakerTimeoutRef.current);
    }
    circuitBreakerTimeoutRef.current = setTimeout(() => {
      console.log('Resetting API circuit breaker, will retry API calls...');
      setApiCircuitOpen(false);
    }, 30000); // Shorter timeout for faster recovery
  }, []);

  // Open circuit breaker when API is failing
  const openCircuitBreaker = useCallback(() => {
    console.warn('Opening API circuit breaker due to consecutive failures');
    setApiCircuitOpen(true);
    setLastApiFailureTime(Date.now());
    resetCircuitBreaker();
  }, [resetCircuitBreaker]);

  // Fetch random poems from API
  const fetchRandomPoems = async (count: number = 100): Promise<Poem[]> => {
    // Check circuit breaker
    if (apiCircuitOpen) {
      console.log('API circuit breaker is open, skipping API calls');
      return [];
    }

    const poems: Poem[] = [];
    const maxAttempts = Math.min(count * 1.5, 30); // More attempts allowed
    let consecutiveFailures = 0;
    let totalAttempts = 0;
    let emptyResponses = 0;
    let networkErrors = 0;

    console.log(`Starting to fetch ${count} poems...`);

    try {
      for (let i = 0; i < maxAttempts && poems.length < count && consecutiveFailures < 8; i++) {
        totalAttempts++;
        try {
          const response = await fetch('https://api.ganjoor.net/api/ganjoor/poem/random', {
            signal: AbortSignal.timeout(5000), // Longer timeout for stability
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Persian Poetry App',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            // Get response text first to check if it's empty
            const responseText = await response.text();
            if (!responseText.trim()) {
              emptyResponses++;
              console.log(`Empty response ${emptyResponses}/${totalAttempts}`);
              
              // Don't count empty responses as consecutive failures immediately
              // Give the API more chances to recover
              if (emptyResponses > consecutiveFailures) {
                consecutiveFailures++;
              }
              
              // Only open circuit breaker if we get many empty responses AND other failures
              if (emptyResponses >= 5 && consecutiveFailures >= 5) {
                console.warn(`Received ${emptyResponses} empty responses with ${consecutiveFailures} consecutive failures, API may be unavailable`);
                openCircuitBreaker();
                break;
              }
              
              // Add a small delay before retrying empty responses
              await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
              continue;
            }

            // Try to parse JSON - be more lenient about content-type
            let data;
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              // Check if response looks like HTML (error page) or other non-JSON
              if (responseText.trim().startsWith('<')) {
                console.warn('Received HTML response instead of JSON (possible error page)');
              } else {
                console.warn('JSON parse error:', jsonError, 'Response preview:', responseText.substring(0, 100));
              }
              consecutiveFailures++;
              continue;
            }

            // Basic sanity check on the parsed data
            if (!data || typeof data !== 'object') {
              console.warn('Invalid JSON structure received:', typeof data);
              consecutiveFailures++;
              continue;
            }

            // Validate data structure - API structure has changed
            const poemText = data.plainText || data.text;
            
            // Extract poet info from fullTitle or sections
            let poetInfo = null;
            
            if (data.poet && data.poet.name) {
              // Old API structure
              poetInfo = {
                id: data.poet.id,
                name: data.poet.name,
                fullName: data.poet.fullName || data.poet.name
              };
            } else if (data.fullTitle) {
              // New API structure - extract poet from fullTitle
              const titleParts = data.fullTitle.split(' » ');
              if (titleParts.length > 0) {
                poetInfo = {
                  id: data.sections?.[0]?.poetId || Math.floor(Math.random() * 1000000),
                  name: titleParts[0].trim(),
                  fullName: titleParts[0].trim()
                };
              }
            } else if (data.sections && data.sections.length > 0 && data.sections[0].poetId) {
              // Extract from sections array
              const section = data.sections[0];
              poetInfo = {
                id: section.poetId,
                name: `شاعر ${section.poetId}`, // Fallback name
                fullName: `شاعر ${section.poetId}`
              };
            }
            
            // Check if poem is already used (don't count as failure)
            if (data?.id && usedPoemIds.has(data.id)) {
              console.log(`Skipping duplicate poem ID: ${data.id}`);
              continue;
            }
            
            // Validate poem data structure
            if (data && data.id && poetInfo && poetInfo.name && poemText) {
              poems.push({
                id: data.id,
                title: data.title || 'بدون عنوان',
                text: poemText,
                htmlText: data.htmlText || poemText.replace(/\r\n/g, '<br/>').replace(/\n/g, '<br/>'),
                poet: poetInfo
              });
              setUsedPoemIds(prev => new Set([...prev, data.id]));
              consecutiveFailures = 0;
            } else {
              console.warn('Invalid poem data structure - missing required fields:', {
                hasId: !!data?.id,
                hasPoetFromDirect: !!(data?.poet?.name),
                hasPoetFromTitle: !!(data?.fullTitle && data.fullTitle.split(' » ').length > 0),
                hasPoetFromSections: !!(data?.sections?.[0]?.poetId),
                extractedPoetName: poetInfo?.name || 'none',
                hasText: !!(data?.plainText || data?.text)
              });
              consecutiveFailures++;
            }
          } else {
            console.warn('API response not ok:', response.status, response.statusText);
            consecutiveFailures++;
          }
        } catch (fetchError) {
          consecutiveFailures++;
          console.error('Single fetch error:', fetchError);
          
          // Track network errors separately
          if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
            networkErrors++;
            console.warn(`Network error ${networkErrors}/${totalAttempts}:`, fetchError.message);
          }
          
          // If we get too many network errors, that's a real issue
          if (networkErrors >= 3) {
            console.warn(`${networkErrors} network errors detected, will open circuit breaker`);
            openCircuitBreaker();
            break;
          }
        }
        
        // Circuit breaker: more lenient failure threshold
        if (consecutiveFailures >= 8) {
          console.warn(`${consecutiveFailures} consecutive failures, opening circuit breaker`);
          openCircuitBreaker();
          break;
        }
        
        // Progressive delays for retries
        if (consecutiveFailures > 0) {
          const baseDelay = Math.min(300 * Math.min(consecutiveFailures, 3), 2000);
          const jitter = Math.random() * 300;
          const delay = baseDelay + jitter;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      console.log(`Fetch completed: ${poems.length} poems fetched in ${totalAttempts} attempts (${emptyResponses} empty responses, ${networkErrors} network errors)`);
      
      // Only open circuit breaker if we got very few poems AND had many failures
      if (poems.length < Math.max(1, count * 0.1) && totalAttempts > 10 && (networkErrors >= 2 || consecutiveFailures >= 6)) {
        console.warn('API appears to be having persistent issues, opening circuit breaker');
        openCircuitBreaker();
      }
      
      return poems;
    } catch (error) {
      console.error('API fetch error:', error);
      return [];
    }
  };

  // Get mock poems based on language
  const getMockPoems = () => {
    return language === 'fa' ? mockPoemsFa : mockPoemsEn;
  };

  // Load initial poems
  const loadInitialPoems = async () => {
    setLoading(true);
    try {
      // For English, always use mock data since Ganjoor API only has Persian poems
      if (language === 'en') {
        console.log('Loading English mock poems...');
        const shuffledMock = shuffleArray(getMockPoems());
        setPoems(shuffledMock);
        setUsingMockData(true);
        shuffledMock.forEach(poem => setUsedPoemIds(prev => new Set([...prev, poem.id])));
        setLoading(false);
        return;
      }

      console.log('Loading initial poems from API...');
      
      // Try API with a very short timeout for initial load
      const apiPromise = fetchRandomPoems(5); // Very small batch
      const timeoutPromise = new Promise<Poem[]>((_, reject) => {
        setTimeout(() => reject(new Error('Initial load timeout')), 5000);
      });
      
      try {
        const apiPoems = await Promise.race([apiPromise, timeoutPromise]);
        
        if (apiPoems.length >= 2) { // Very low threshold for initial load
          setPoems(apiPoems);
          setUsingMockData(false);
          console.log('Successfully loaded poems from API');
        } else {
          throw new Error('Insufficient poems from API');
        }
      } catch (apiError) {
        console.log('API failed for initial load, using mock data immediately');
        throw apiError;
      }
    } catch (error) {
      console.log('Loading mock data for initial display');
      // Fallback to mock data immediately
      const shuffledMock = shuffleArray(getMockPoems());
      setPoems(shuffledMock);
      setUsingMockData(true);
      // For mock data, we can repeat the poems
      shuffledMock.forEach(poem => setUsedPoemIds(prev => new Set([...prev, poem.id])));
    } finally {
      setLoading(false);
    }
  };

  // Load more poems
  const loadMorePoems = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      if (usingMockData || apiCircuitOpen || language === 'en') {
        console.log('Loading more mock poems...');
        // For mock data, just repeat the shuffled poems
        const shuffledMock = shuffleArray(getMockPoems());
        setPoems(prev => [...prev, ...shuffledMock]);
      } else {
        console.log('Loading more poems from API...');
        
        // Quick timeout for loading more poems
        const apiPromise = fetchRandomPoems(3); // Very small batch
        const timeoutPromise = new Promise<Poem[]>((_, reject) => {
          setTimeout(() => reject(new Error('Load more timeout')), 3000);
        });
        
        try {
          const newPoems = await Promise.race([apiPromise, timeoutPromise]);
          if (newPoems.length >= 1) { // Accept even 1 poem
            setPoems(prev => [...prev, ...newPoems]);
            console.log(`Added ${newPoems.length} more poems from API`);
          } else {
            throw new Error('No poems received');
          }
        } catch (apiError) {
          console.log('API failed for loading more, switching to mock data');
          const shuffledMock = shuffleArray(getMockPoems());
          setPoems(prev => [...prev, ...shuffledMock]);
          setUsingMockData(true);
        }
      }
    } catch (error) {
      console.error('Load more poems error:', error);
      // Fallback to mock data on any error
      const shuffledMock = shuffleArray(getMockPoems());
      setPoems(prev => [...prev, ...shuffledMock]);
      setUsingMockData(true);
    } finally {
      setLoadingMore(false);
    }
  };

  // Navigate to specific poem with card transition
  const navigateToPoem = useCallback((index: number) => {
    if (index >= 0 && index < poems.length) {
      setCurrentIndex(index);
    }
  }, [poems.length]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isScrolling) return;
    
    const touch = e.touches[0];
    setTouchStart({
      y: touch.clientY,
      time: Date.now()
    });
  }, [isScrolling]);

  // Handle touch move for real-time swipe feedback
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaY = touchStart.y - touch.clientY;
    
    // Show swipe direction feedback
    if (Math.abs(deltaY) > 30) {
      setSwipeDirection(deltaY > 0 ? 'up' : 'down');
    } else {
      setSwipeDirection(null);
    }
  }, [touchStart]);

  // Handle touch end - detect swipe gestures
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaY = touchStart.y - touch.clientY;
    const deltaTime = Date.now() - touchStart.time;
    const velocity = Math.abs(deltaY) / deltaTime;

    // More sensitive swipe thresholds for quicker response
    const minSwipeDistance = 30;
    const minVelocity = 0.2;

    if (Math.abs(deltaY) > minSwipeDistance || velocity > minVelocity) {
      e.preventDefault();
      
      // Track swipe count
      swipeCountRef.current += 1;

      if (deltaY > 0) {
        // Swipe up - go to next poem
        const nextIndex = Math.min(currentIndex + 1, poems.length - 1);
        if (nextIndex !== currentIndex) {
          setSwipeDirection('up');
          navigateToPoem(nextIndex);
        }
      } else {
        // Swipe down - go to previous poem
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (prevIndex !== currentIndex) {
          setSwipeDirection('down');
          navigateToPoem(prevIndex);
        }
      }
    }

    // Load more poems if we're near the end
    if (currentIndex >= poems.length - 3 && !loadingMore && hasMore) {
      loadMorePoems();
    }

    // Reset states faster
    setTimeout(() => {
      setTouchStart(null);
      setSwipeDirection(null);
    }, 150);
  }, [touchStart, currentIndex, poems.length, navigateToPoem, loadingMore, hasMore]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      if (prevIndex !== currentIndex) {
        setSwipeDirection('down');
        navigateToPoem(prevIndex);
        setTimeout(() => setSwipeDirection(null), 150);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, poems.length - 1);
      if (nextIndex !== currentIndex) {
        setSwipeDirection('up');
        navigateToPoem(nextIndex);
        setTimeout(() => setSwipeDirection(null), 150);
      }
      
      // Load more poems if we're near the end
      if (nextIndex >= poems.length - 3 && !loadingMore && hasMore) {
        loadMorePoems();
      }
    }
  }, [currentIndex, poems.length, navigateToPoem, loadingMore, hasMore]);

  // Handle auth requirement for favorites
  const handleAuthRequired = () => {
    setAuthSheetOpen(true);
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    if (user) {
      setProfileSheetOpen(true);
    } else {
      setAuthSheetOpen(true);
    }
  };

  // Handle show favorites
  const handleShowFavorites = () => {
    setProfileSheetOpen(false);
    setFavoritesSheetOpen(true);
  };

  // Load initial data
  useEffect(() => {
    loadInitialPoems();
    
    // Add global error handler for authentication errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('refresh_token_not_found') || 
          event.reason?.message?.includes('Invalid Refresh Token')) {
        console.log('Caught unhandled auth error, attempting refresh');
        event.preventDefault(); // Prevent the error from being logged to console
        refreshSession().catch(() => {
          console.log('Session refresh failed, user may need to re-login');
        });
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Cleanup circuit breaker timeout on unmount
    return () => {
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [refreshSession]);

  // Reload poems when language changes
  useEffect(() => {
    if (poems.length > 0) { // Only reload if we already have poems loaded
      setCurrentIndex(0); // Reset to first poem
      setUsedPoemIds(new Set()); // Clear used poem IDs
      loadInitialPoems();
    }
  }, [language]);

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Keyboard navigation
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown]);

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin mb-6"></div>
        <div className="text-foreground text-xl md:text-2xl animate-pulse" dir={isRTL ? "rtl" : "ltr"}>{t.loading}</div>
        {usingMockData && (
          <div className="text-foreground/60 text-sm mt-2" dir={isRTL ? "rtl" : "ltr"}>{t.mockDataSubtitle}</div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-background relative overflow-hidden"
      style={{ 
        touchAction: 'pan-y', // Allow only vertical scrolling
        height: '100vh',
        height: '100dvh' // Use dynamic viewport height for better mobile support
      }}
    >
      {/* Quick swipe feedback overlay */}
      {swipeDirection && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`text-foreground text-4xl transform transition-all duration-100 ${
            swipeDirection === 'up' ? 'translate-y-2 opacity-80' : '-translate-y-2 opacity-80'
          }`}>
            {swipeDirection === 'up' ? '↑' : '↓'}
          </div>
        </div>
      )}

      {/* Render cards - only render visible cards for performance */}
      {poems.slice(Math.max(0, currentIndex - 1), Math.min(poems.length, currentIndex + 2)).map((poem, relativeIndex) => {
        const actualIndex = Math.max(0, currentIndex - 1) + relativeIndex;
        return (
          <PoemCard 
            key={`${poem.id}-${actualIndex}`}
            poem={poem} 
            isActive={actualIndex === currentIndex} 
            currentIndex={currentIndex}
            cardIndex={actualIndex}
          />
        );
      })}
      
      {/* Progress indicator */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-4">
        {Array.from({ length: 5 }, (_, i) => {
          // Only show dots if we have poems
          if (poems.length === 0) return null;
          
          // Calculate the relative position in a sliding window
          const windowStart = Math.max(0, currentIndex - 2);
          const dotIndex = windowStart + i;
          const isVisible = dotIndex < poems.length;
          const isActive = dotIndex === currentIndex && isVisible;
          
          return (
            <div
              key={i}
              className={`w-1.5 h-4 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-foreground' 
                  : isVisible 
                    ? 'bg-foreground/30' 
                    : 'bg-foreground/10'
              }`}
              style={{
                opacity: isVisible ? 1 : 0.3
              }}
            />
          );
        })}
        {/* Current position indicator */}
        <div className="mt-2 text-foreground/50 text-xs text-right" dir="rtl">
          {currentIndex + 1}
        </div>
      </div>


      
      {/* Loading indicator when loading more */}
      {loadingMore && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="text-foreground/60 text-sm animate-pulse" dir={isRTL ? "rtl" : "ltr"}>
            {t.loading}
          </div>
        </div>
      )}
      
      {/* API status indicator */}
      {(usingMockData || apiCircuitOpen || language === 'en') && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-yellow-600/20 text-yellow-300 text-xs px-2 py-1 rounded" dir={isRTL ? "rtl" : "ltr"}>
            {apiCircuitOpen ? t.apiUnavailable : t.sampleMode}
          </div>
        </div>
      )}

      {/* Button Stack with Language and Favorite buttons */}
      <ButtonStack 
        poem={poems.length > 0 ? poems[currentIndex] : undefined}
        onAuthRequired={handleAuthRequired}
      />

      {/* Settings Button */}
      <SettingsButton onOpen={handleSettingsClick} />

      {/* Auth Sheet */}
      <AuthSheet 
        open={authSheetOpen} 
        onOpenChange={setAuthSheetOpen} 
      />

      {/* Profile Sheet */}
      <DraggableProfileSheet 
        open={profileSheetOpen} 
        onOpenChange={setProfileSheetOpen}
        onShowFavorites={handleShowFavorites}
      />

      {/* Favorites Sheet */}
      <DraggableFavoritesSheet 
        open={favoritesSheetOpen} 
        onOpenChange={setFavoritesSheetOpen}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProfileProvider>
            <AppContent />
          </ProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}