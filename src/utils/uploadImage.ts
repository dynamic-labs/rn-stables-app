import { decode } from "base64-arraybuffer";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";

const BUCKET_NAME = "profile-pictures";

export interface UploadImageResult {
  url: string;
  error: Error | null;
}

/**
 * Generate a unique ID without using crypto
 */
const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 10);
};

/**
 * Uploads an image to Supabase Storage
 * @param uri Local image URI
 * @param userId User ID for organizing uploads
 */
export const uploadImage = async (
  uri: string,
  userId: string
): Promise<UploadImageResult> => {
  try {
    // Generate a unique file path using our custom function instead of uuid
    // Get the file extension from the URI, handling potential URI formats
    let fileExt = "jpg"; // Default extension
    if (uri.includes(".")) {
      fileExt = uri
        .substring(uri.lastIndexOf(".") + 1)
        .split(/[?#]/)[0]
        .toLowerCase();
    }

    // Validate extension
    if (!["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
      fileExt = "jpg"; // Default to jpg for unrecognized formats
    }

    const uniqueId = generateUniqueId();
    const filePath = `${userId}/${uniqueId}.${fileExt}`;

    // Handle different platforms
    let base64Image;

    if (Platform.OS === "web") {
      // For web, fetch the image and convert to base64
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      base64Image = arrayBuffer;
    } else {
      // For mobile, handle different URI formats
      try {
        // Check if the file exists first
        const fileInfo = await FileSystem.getInfoAsync(uri);

        if (!fileInfo.exists) {
          // If it's not directly accessible, it might be a remote or asset URI
          // Try to download it first to a temporary location
          if (uri.startsWith("http") || uri.startsWith("asset")) {
            const tmpDownloadPath =
              FileSystem.cacheDirectory + uniqueId + "." + fileExt;
            const downloadResult = await FileSystem.downloadAsync(
              uri,
              tmpDownloadPath
            );

            if (downloadResult.status !== 200) {
              throw new Error(
                `Failed to download image: ${downloadResult.status}`
              );
            }

            uri = downloadResult.uri;
          } else {
            return {
              url: "",
              error: new Error(
                "File does not exist and couldn't be downloaded"
              ),
            };
          }
        }

        // Now read the file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        base64Image = decode(base64);
      } catch (fileError: unknown) {
        console.error("File handling error:", fileError);
        const errorMessage =
          fileError instanceof Error ? fileError.message : "Unknown file error";
        return {
          url: "",
          error: new Error(`File handling error: ${errorMessage}`),
        };
      }
    }

    // Upload to Supabase Storage with retry logic
    let retries = 2;
    let uploadError = null;

    while (retries >= 0) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, base64Image, {
            contentType: `image/${fileExt}`,
            upsert: true, // Changed to true to overwrite if needed
          });

        if (!error) {
          // Success! Break out of retry loop
          uploadError = null;
          break;
        }

        uploadError = error;
        console.warn(
          `Upload attempt failed (${retries} retries left):`,
          error.message
        );
      } catch (e) {
        uploadError =
          e instanceof Error ? e : new Error("Unknown upload error");
        console.warn(
          `Upload exception (${retries} retries left):`,
          uploadError.message
        );
      }

      retries--;
      if (retries >= 0) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (uploadError) {
      console.error("Upload ultimately failed:", uploadError);
      return { url: "", error: uploadError };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      url: "",
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
};

/**
 * Delete an image from Supabase Storage
 * @param url Full public URL of the image
 */
export const deleteImage = async (
  url: string
): Promise<{ error: Error | null }> => {
  try {
    // Extract file path from URL
    const urlParts = url.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      return { error: new Error("Invalid URL format") };
    }

    const filePath = urlParts[1];

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    return { error };
  } catch (error) {
    console.error("Error deleting image:", error);
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
};

export default {};
