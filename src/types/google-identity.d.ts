interface GoogleIdCredentialResponse {
  credential?: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleIdCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleIdButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  logo_alignment?: "left" | "center";
}

interface GoogleIdentityIdApi {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleIdButtonConfiguration) => void;
  prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void;
  cancel?: () => void;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: () => void;
}

interface Window {
  google?: {
    accounts?: {
      id?: GoogleIdentityIdApi;
      oauth2: {
        initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
      };
    };
  };
}
