// utils/downloadQR.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QRCode } from 'react-qrcode-logo';

/**
 * Converts an image URL to a base64 data URL
 * This is necessary for production environments where CORS or relative paths may fail
 */
async function imageToDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Handle absolute URLs
    const imageUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      // Fallback: try to fetch the image as blob and convert
      fetch(imageUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load image: ${response.statusText}`);
          return response.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    };

    img.src = imageUrl;
  });
}

export async function downloadQR(
  value: string,
  logo: string = '/logo192.png',
  size: number = 500,
  fileName: string = 'qrcode'
) {
  try {
    // Convert logo to data URL to avoid CORS and path issues in production
    let logoDataURL: string | undefined;
    if (logo) {
      try {
        logoDataURL = await imageToDataURL(logo);
      } catch (error) {
        console.warn('Failed to load logo image, generating QR code without logo:', error);
        // Continue without logo if image fails to load
      }
    }

    // Create a temporary container for the QR code
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    // Create a promise to handle the QR code generation
    return new Promise<void>((resolve, reject) => {
      const QRCodeComponent = () => {
        const qrRef = React.useRef<any>(null);

        React.useEffect(() => {
          const downloadQRCode = async () => {
            try {
              if (qrRef.current) {
                // Call the download method from react-qrcode-logo
                qrRef.current.download(fileName);
                resolve();
              } else {
                reject(new Error('QR code ref not available'));
              }
            } catch (error) {
              console.error('Error downloading QR code:', error);
              reject(error);
            } finally {
              // Cleanup
              if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
              }
            }
          };

          // Small delay to ensure QR code is rendered
          setTimeout(downloadQRCode, 100);
        }, []);

        return (
          <QRCode
            ref={qrRef}
            value={value}
            size={size}
            logoImage={logoDataURL}
            logoWidth={size * 0.25}
            logoHeight={size * 0.25}
            logoOpacity={1}
            enableCORS={false}
            qrStyle="fluid"
            ecLevel="H"
            eyeRadius={[
              [10, 10, 0, 10], // top-left
              [10, 10, 10, 0], // top-right
              [10, 0, 10, 10], // bottom-left
            ]}
            eyeColor="#000000"
            bgColor="#ffffff"
            fgColor="#000000"
            quietZone={20}
            removeQrCodeBehindLogo={true}
          />
        );
      };

      // Render the QR code component
      const root = createRoot(tempContainer);
      root.render(<QRCodeComponent />);
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code. Please try again.');
  }
}
