import { useEffect, useRef } from "react";
import Script from "./script";
import {
  CloudinaryInstance,
  UploadWidgetError,
  UploadWidgetInstance,
  UploadWidgetProps,
  UploadWidgetResults,
} from "./upload-widget.type";

const UploadWidget = ({ children, onSuccess, onError }: UploadWidgetProps) => {
  const cloudinary = useRef<CloudinaryInstance>();
  const widget = useRef<UploadWidgetInstance>();

  // const [isScriptLoading, setIsScriptLoading] = useState(true);

  const uploadOptions = {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    styles: {
      palette: {
        window: '#0F172A', // Dark blue background (matches seaBlue-1075)
        windowBorder: '#2D7FEA', // tropicalBlue border
        tabIcon: '#2D7FEA', // tropicalBlue icon
        menuIcons: '#CBD5E1', // Light text color
        textDark: '#CBD5E1', // Light text color
        textLight: '#0F172A', // Dark blue text for light backgrounds
        link: '#2D7FEA', // tropicalBlue links
        action: '#2D7FEA', // tropicalBlue actions
        inactiveTabIcon: '#94A3B8', // Lighter blue for inactive
        error: '#E11D48', // Error color (highlightRed)
        inProgress: '#2D7FEA', // tropicalBlue for progress
        complete: '#10B981', // Success green
        sourceBg: '#1E293B', // Slightly lighter blue for source background
      },
      frame: {
        background: 'rgba(15, 23, 42, 0.95)', // Slightly transparent dark background
      },
      fonts: {
        default: null,
        "'Proxima Nova', sans-serif": {
          url: null,
          active: true
        }
      }
    },
  };

  function handleOnLoad() {
    // setIsScriptLoading(false);

    // Store the Cloudinary window instance to a ref when the page renders

    if (!cloudinary.current && typeof window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cloudinary.current = (window as any).cloudinary;
    }

    // To help improve load time of the widget on first instance, use requestIdleCallback
    // to trigger widget creation. If requestIdleCallback isn't supported, fall back to
    // setTimeout: https://caniuse.com/requestidlecallback

    function onIdle() {
      if (!widget.current) {
        widget.current = createWidget();
      }
    }

    if ("requestIdleCallback" in window) {
      requestIdleCallback(onIdle);
    } else {
      setTimeout(onIdle, 1);
    }
  }

  useEffect(() => {
    return () => {
      widget.current?.destroy();
      widget.current = undefined;
      cloudinary.current = undefined;
    };
  }, []);

  /**
   * createWidget
   * @description Creates a new instance of the Cloudinary widget and stores in a ref
   */

  function createWidget() {
    return cloudinary.current?.createUploadWidget(
      uploadOptions,
      function (error: UploadWidgetError, result: UploadWidgetResults) {
        if (error && typeof onError === "function") {
          onError(error, widget.current);
        }

        if (result.event === "success" && typeof onSuccess === "function") {
          onSuccess(result, widget.current);
        }
      }
    );
  }

  /**
   * open
   * @description When triggered, uses the current widget instance to open the upload modal
   */

  const open = () => {
    if (!widget.current) {
      widget.current = createWidget();
    }

    // Add custom CSS to make the upload widget fit the modal better
    const styleElement = document.createElement('style');
    styleElement.id = 'cloudinary-widget-custom-styles';
    styleElement.textContent = `
      .cloudinary-overlay {
        background-color: rgba(0, 0, 0, 0.8) !important;
      }
      .cloudinary-widget {
        max-width: 90% !important;
        max-height: 90vh !important;
        margin: auto !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
      }
      .cloudinary-dropzone {
        background-color: #1E293B !important;
        border: 2px dashed #2D7FEA !important;
        border-radius: 8px !important;
      }
      .cloudinary-button {
        background-color: #2D7FEA !important;
      }
      .cloudinary-thumbnail {
        background-color: #1E293B !important;
      }
    `;

    // Remove any existing style if present
    const existingStyle = document.getElementById('cloudinary-widget-custom-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(styleElement);

    widget.current.open();
  };

  return (
    <>
      {typeof children === "function" && children({ cloudinary, widget, open })}
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        onLoad={handleOnLoad}
        onError={() => console.error(`Failed to load Cloudinary Upload Widget`)}
      />
    </>
  );
};

export default UploadWidget;
