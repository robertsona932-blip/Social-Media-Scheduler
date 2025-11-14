import React, { useState, useEffect, useRef } from 'react';
import Composer from './components/Composer';
import PostPreview from './components/PostPreview';
import ScheduledPostList from './components/ScheduledPostList';
import LoginModal from './components/LoginModal';
import { Post, Platform, PostStatus } from './types';
import * as blueskyService from './services/blueskyService';
import * as facebookService from './services/facebookService';
import { UserCircleIcon, BlueskyIcon, FacebookIcon } from './components/Icons';

const App: React.FC = () => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  now.setSeconds(0);
  const defaultScheduleTime = now.toISOString().slice(0, 16);
  const [scheduledTime, setScheduledTime] = useState(defaultScheduleTime);

  const [posts, setPosts] = useState<Post[]>([]);
  
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.Bluesky);
  const [isBlueskyLoginOpen, setIsBlueskyLoginOpen] = useState(false);
  
  const [isBlueskyConnected, setIsBlueskyConnected] = useState(false);
  const [blueskyUserHandle, setBlueskyUserHandle] = useState<string | null>(null);

  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  const [facebookUserName, setFacebookUserName] = useState<string | null>(null);
  const [facebookPageId, setFacebookPageId] = useState<string | null>(null);
  const [facebookPageAccessToken, setFacebookPageAccessToken] = useState<string | null>(null);
  const [facebookError, setFacebookError] = useState<string | null>(null);

  const connectionDetailsRef = useRef({ facebookPageId, facebookPageAccessToken });
  useEffect(() => {
    connectionDetailsRef.current = { facebookPageId, facebookPageAccessToken };
  }, [facebookPageId, facebookPageAccessToken]);

  const isConnected = {
    [Platform.Bluesky]: isBlueskyConnected,
    [Platform.Facebook]: isFacebookConnected,
  }

  useEffect(() => {
    facebookService.initFacebookSdk().then(() => {
        console.log("Facebook SDK Initialized");
    }).catch((err) => {
        console.error("Facebook SDK could not be initialized. Facebook functionality will be disabled.", err);
        setFacebookError(err.message || "Facebook SDK failed to load. It may be blocked by your browser or an ad blocker.");
    });
  }, []);

  useEffect(() => {
    const timers = new Map<string, number>();

    const processPost = async (post: Post) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: PostStatus.Posting } : p));
        try {
            let result;
            if (post.platform === Platform.Bluesky) {
                result = await blueskyService.postToBluesky(post.content, post.imageFile);
            } else if (post.platform === Platform.Facebook) {
                const { facebookPageId: currentPageId, facebookPageAccessToken: currentPageAccessToken } = connectionDetailsRef.current;
                if (!currentPageId || !currentPageAccessToken) throw new Error("Facebook Page details not available. Please reconnect.");
                result = await facebookService.postToFacebook(post.content, post.imageFile, currentPageId, currentPageAccessToken);
            } else {
                throw new Error(`Unsupported platform: ${post.platform}`);
            }
            if (!result) throw new Error("Posting service did not return a result.");
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: PostStatus.Posted, postUri: result.uri } : p));
        } catch(err: any) {
            console.error(`Failed to post ${post.id}:`, err);
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: PostStatus.Failed, error: err.message } : p));
        }
    };

    posts.forEach(post => {
      if (post.status === PostStatus.Scheduled) {
        const delay = post.scheduledTime.getTime() - new Date().getTime();
        if (delay > 0) {
          const timer: number = window.setTimeout(() => {
            processPost(post);
          }, delay);
          timers.set(post.id, timer);
        } else {
           setPosts(prevPosts => 
             prevPosts.map(p => p.id === post.id ? { ...p, status: PostStatus.Failed, error: "Scheduled time is in the past." } : p)
           );
        }
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [posts]);

  const handleBlueskyConnect = async (handle: string, appPassword: string) => {
    const response = await blueskyService.login(handle, appPassword);
    if (response.success) {
      setIsBlueskyConnected(true);
      setBlueskyUserHandle(response.handle);
      setIsBlueskyLoginOpen(false);
    }
  };

  const handleFacebookConnect = async () => {
    try {
        const response = await facebookService.login();
        if (response.success) {
            setIsFacebookConnected(true);
            setFacebookUserName(response.name);
            setFacebookPageId(response.pageId);
            setFacebookPageAccessToken(response.pageAccessToken);
        }
    } catch(err: any) {
        alert(`Facebook Connection Failed: ${err.message}`);
        console.error(err);
    }
  }

  const handleBlueskyDisconnect = () => {
      blueskyService.disconnect();
      setIsBlueskyConnected(false);
      setBlueskyUserHandle(null);
  }
  
  const handleFacebookDisconnect = () => {
      facebookService.disconnect();
      setIsFacebookConnected(false);
      setFacebookUserName(null);
      setFacebookPageId(null);
      setFacebookPageAccessToken(null);
  }

  const handleSchedule = (platform: Platform) => {
    if (!content.trim() || !scheduledTime || !isConnected[platform]) return;
    
    const newPost: Post = {
      id: crypto.randomUUID(),
      content,
      platform: platform,
      scheduledTime: new Date(scheduledTime),
      status: PostStatus.Scheduled,
    };
    if (imageUrl && imageFile) {
        newPost.image = { url: imageUrl, name: imageFile.name };
        newPost.imageFile = imageFile;
    }

    setPosts(prev => [...prev, newPost]);

    setContent('');
    setImageUrl(null);
    setImageFile(null);
    setScheduledTime(defaultScheduleTime);
  };

  const handlePostNow = async (platform: Platform) => {
    if (!content.trim() || !isConnected[platform]) return;

    const postId = crypto.randomUUID();
    const newPost: Post = {
      id: postId,
      content,
      platform: platform,
      scheduledTime: new Date(),
      status: PostStatus.Posting,
    };
    if (imageUrl && imageFile) {
        newPost.image = { url: imageUrl, name: imageFile.name };
        newPost.imageFile = imageFile;
    }

    setPosts(prev => [...prev, newPost]);

    setContent('');
    setImageUrl(null);
    setImageFile(null);
    setScheduledTime(defaultScheduleTime);

    try {
        let result;
        if (newPost.platform === Platform.Bluesky) {
            result = await blueskyService.postToBluesky(newPost.content, newPost.imageFile);
        } else if (newPost.platform === Platform.Facebook) {
            const { facebookPageId: currentPageId, facebookPageAccessToken: currentPageAccessToken } = connectionDetailsRef.current;
            if (!currentPageId || !currentPageAccessToken) throw new Error("Facebook Page details not available. Please reconnect.");
            result = await facebookService.postToFacebook(newPost.content, newPost.imageFile, currentPageId, currentPageAccessToken);
        } else {
            throw new Error(`Unsupported platform: ${newPost.platform}`);
        }
        if (!result) throw new Error("Posting service did not return a result.");
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: PostStatus.Posted, postUri: result.uri } : p));
    } catch(err: any) {
        console.error(`Failed to post now ${postId}:`, err);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: PostStatus.Failed, error: err.message } : p));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
       <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-700 opacity-20 blur-[100px]"></div>
      </div>
      
      <header className="p-4 pt-6 text-center">
        <div className="container mx-auto flex justify-end gap-2 flex-wrap">
            {isBlueskyConnected ? (
                <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 p-2 rounded-full">
                    <div className="flex items-center gap-2">
                        <UserCircleIcon className="w-6 h-6 text-slate-300" />
                        <span className="text-sm font-medium text-white">@{blueskyUserHandle}</span>
                    </div>
                    <button onClick={handleBlueskyDisconnect} className="text-sm text-slate-300 hover:text-white font-semibold py-1 px-3 rounded-full hover:bg-slate-700 transition">Disconnect</button>
                </div>
            ) : (
                <button 
                  onClick={() => setIsBlueskyLoginOpen(true)} 
                  className="flex items-center gap-2 bg-sky-500 text-white font-bold py-2 px-4 rounded-full hover:bg-sky-600 transition"
                >
                  <BlueskyIcon className="w-5 h-5" />
                  Connect to Bluesky
                </button>
            )}
            {isFacebookConnected ? (
                 <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 p-2 rounded-full">
                    <div className="flex items-center gap-2">
                        <UserCircleIcon className="w-6 h-6 text-slate-300" />
                        <span className="text-sm font-medium text-white">{facebookUserName}</span>
                    </div>
                    <button onClick={handleFacebookDisconnect} className="text-sm text-slate-300 hover:text-white font-semibold py-1 px-3 rounded-full hover:bg-slate-700 transition">Disconnect</button>
                </div>
            ) : (
                <div title={facebookError || 'Connect to your Facebook account'}>
                  <button 
                    onClick={handleFacebookConnect} 
                    disabled={!!facebookError}
                    className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition disabled:bg-slate-600 disabled:cursor-not-allowed"
                  >
                    <FacebookIcon className="w-5 h-5" />
                    Connect to Facebook
                  </button>
                </div>
            )}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl mt-4">
          Social Post <span className="text-indigo-400">Scheduler</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-slate-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Craft, generate with AI, and schedule your social media posts effortlessly.
        </p>
      </header>
      
      <main className="container mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Composer
            content={content}
            setContent={setContent}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            setImageFile={setImageFile}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            onSchedule={handleSchedule}
            onPostNow={handlePostNow}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            isConnected={isConnected}
          />
          <div className="space-y-8">
            <PostPreview 
                content={content} 
                imageUrl={imageUrl} 
                platform={selectedPlatform}
                userHandle={blueskyUserHandle} 
                userName={facebookUserName}
            />
            <ScheduledPostList posts={posts} userHandle={blueskyUserHandle} />
          </div>
        </div>
      </main>
      <LoginModal 
        isOpen={isBlueskyLoginOpen}
        onClose={() => setIsBlueskyLoginOpen(false)}
        onConnect={handleBlueskyConnect}
      />
    </div>
  );
}

export default App;