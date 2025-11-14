declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
}

declare const FB: any;

let sdkInitializationPromise: Promise<void> | null = null;

export interface LoginResponse {
  success: boolean;
  name: string;
  pageId: string;
  pageAccessToken: string;
}

export const initFacebookSdk = (): Promise<void> => {
  if (sdkInitializationPromise) {
    return sdkInitializationPromise;
  }

  sdkInitializationPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = function() {
      try {
        FB.init({
          appId: '830979152759984',
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    (function(d, s, id){
       let js: HTMLScriptElement, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) { return; }
       js = d.createElement(s) as HTMLScriptElement;
       js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       js.onerror = () => reject(new Error("Facebook SDK failed to load. Please check your connection or ad blocker."));
       if (fjs && fjs.parentNode) {
           fjs.parentNode.insertBefore(js, fjs);
       } else {
           d.head.appendChild(js);
       }
     }(document, 'script', 'facebook-jssdk'));
  });
  return sdkInitializationPromise;
};

const ensureSdkInitialized = (): Promise<void> => {
    if (!sdkInitializationPromise) {
        return initFacebookSdk();
    }
    return sdkInitializationPromise;
}

export const login = async (): Promise<LoginResponse> => {
    await ensureSdkInitialized();

    return new Promise((resolve, reject) => {
        FB.login((response: any) => {
            if (response.authResponse) {
                const fetchUserDetails = new Promise<{ name: string }>((res, rej) => {
                    FB.api('/me', { fields: 'name' }, (userRes: any) => {
                        if (userRes && !userRes.error) {
                            res(userRes);
                        } else {
                            rej(userRes.error || 'Failed to fetch user details');
                        }
                    });
                });

                fetchUserDetails.then(userDetails => {
                    const fetchPages = new Promise<any[]>((res, rej) => {
                        FB.api('/me/accounts', (pageRes: any) => {
                            if (pageRes && pageRes.data && pageRes.data.length > 0) {
                                res(pageRes.data);
                            } else {
                                rej(new Error("No manageable Facebook Pages found. You must be an admin of at least one page to post."));
                            }
                        });
                    });
                    return fetchPages.then(pages => ({ userDetails, pages }));
                })
                .then(({ userDetails, pages }) => {
                    const firstPage = pages[0];
                    resolve({
                        success: true,
                        name: userDetails.name,
                        pageId: firstPage.id,
                        pageAccessToken: firstPage.access_token,
                    });
                })
                .catch(error => {
                    reject(error);
                });
            } else {
                reject(new Error("User cancelled login or did not fully authorize."));
            }
        }, { scope: 'public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement' });
    });
};

export const disconnect = async (): Promise<void> => {
    await ensureSdkInitialized();
    return new Promise((resolve) => {
        FB.logout(() => {
            console.log("Facebook session cleared.");
            resolve();
        });
    });
};

export interface PostResponse {
    success: boolean;
    uri: string;
}

export const postToFacebook = async (content: string, imageFile: File | undefined, pageId: string, pageAccessToken: string): Promise<PostResponse> => {
    await ensureSdkInitialized();

    return new Promise(async (resolve, reject) => {
        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append('caption', content);
                formData.append('source', imageFile);
                formData.append('access_token', pageAccessToken);

                const response = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
                    method: 'POST',
                    body: formData,
                });
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error.message);
                }
                resolve({ success: true, uri: data.post_id });

            } else {
                FB.api(`/${pageId}/feed`, 'POST', { message: content, access_token: pageAccessToken }, (response: any) => {
                    if (response && !response.error) {
                        resolve({ success: true, uri: response.id });
                    } else {
                        reject(new Error(response.error?.message || "Failed to create text post."));
                    }
                });
            }
        } catch (error: any) {
            reject(new Error(error.message || "An unexpected error occurred while posting to Facebook."));
        }
    });
};