import { BskyAgent, RichText } from '@atproto/api';

let agent: BskyAgent | null = null;

export interface LoginResponse {
  success: boolean;
  handle: string;
}

export const login = async (handle: string, appPassword: string): Promise<LoginResponse> => {
  try {
    agent = new BskyAgent({ service: 'https://bsky.social' });

    const response = await agent.login({
      identifier: handle,
      password: appPassword,
    });

    if (response.success) {
      return { success: true, handle: response.data.handle };
    } else {
      throw new Error("Login failed. Please check your credentials.");
    }
  } catch (error: any) {
    console.error("Bluesky login error:", error);
    if (error.message?.includes('Authentication failed')) {
        throw new Error("Invalid handle or password. Please check your credentials.");
    }
    throw new Error(error.message || "An unknown error occurred during login.");
  }
};

export const disconnect = (): void => {
    agent = null;
    console.log("User disconnected, session cleared.");
}

export interface PostResponse {
    success: boolean;
    uri: string;
}

export const postToBluesky = async (content: string, imageFile?: File): Promise<PostResponse> => {
    if (!agent?.session) {
        throw new Error("You are not logged in. Please connect to Bluesky first.");
    }
    
    if (content.length > 300) {
        throw new Error("Post must not be longer than 300 characters for Bluesky.");
    }

    try {
        const rt = new RichText({ text: content });
        await rt.detectFacets(agent);

        const postRecord: {
            $type: string;
            text: string;
            facets?: any[];
            createdAt: string;
            embed?: any;
        } = {
            $type: 'app.bsky.feed.post',
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString(),
        };

        if (imageFile) {
            const imageBuffer = new Uint8Array(await imageFile.arrayBuffer());
            const uploadResponse = await agent.uploadBlob(imageBuffer, {
                encoding: imageFile.type,
            });

            if (uploadResponse.success) {
                postRecord.embed = {
                    $type: 'app.bsky.embed.images',
                    images: [{
                        image: uploadResponse.data.blob,
                        alt: content.substring(0, 100),
                    }],
                };
            } else {
                throw new Error("Failed to upload image.");
            }
        }
        
        const postResponse = await agent.post(postRecord);

        return {
            success: true,
            uri: postResponse.uri,
        };

    } catch (error: any) {
        console.error("Failed to post to Bluesky:", error);
        throw new Error(error.message || "An unexpected error occurred while posting.");
    }
};