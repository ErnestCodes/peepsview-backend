declare module 'googleapis' {
  import { OAuth2Client } from 'google-auth-library';

  export interface YouTubeVideo {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: {
        default?: {
          url?: string;
        };
      };
      publishedAt?: string;
    };
  }

  export const google: {
    auth: {
      OAuth2: new (
        clientId: string,
        clientSecret: string,
        redirectUri: string
      ) => OAuth2Client;
    };
    youtube: (version: string) => {
      videos: {
        insert: (params: {
          auth: OAuth2Client;
          part: string[];
          requestBody: {
            snippet: {
              title: string;
              description: string;
              tags?: string[];
            };
            status: {
              privacyStatus: string;
            };
          };
          media?: {
            body: any;
          };
        }) => Promise<{
          data: any;
        }>;
        list: (params: {
          auth: OAuth2Client;
          part: string[];
          id: string[];
        }) => Promise<{ data: any }>;
      };
      channels: {
        list: (params: {
          auth: OAuth2Client;
          part: string[];
          mine: boolean;
        }) => Promise<{
          data: {
            items?: { id: string }[];
          };
        }>;
      };
      search: {
        list: (params: {
          auth: OAuth2Client;
          part: string[];
          forMine?: boolean;
          maxResults?: number;
          type?: string[];
        }) => Promise<{
          data: {
            items?: YouTubeVideo[];
          };
        }>;
      };
    };
  };
}
