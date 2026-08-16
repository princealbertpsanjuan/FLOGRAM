const XAI_API_URL =
  process.env.XAI_API_URL ||
  "https://api.x.ai/v1";

const XAI_MODEL =
  process.env.XAI_MODEL ||
  "grok-4.5";

const XAI_IMAGE_MODEL =
  process.env.XAI_IMAGE_MODEL ||
  "grok-imagine-image";

/*
 * Return the configured xAI API key.
 */
const getXaiApiKey = () => {
  const apiKey =
    process.env.XAI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "XAI_API_KEY is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  return apiKey.trim();
};

/*
 * Extract assistant text from an
 * xAI Responses API response.
 */
const extractResponseText = (
  result
) => {
  /*
   * Some compatible clients expose
   * output_text directly.
   */
  if (
    typeof result?.output_text ===
      "string" &&
    result.output_text.trim()
  ) {
    return result.output_text.trim();
  }

  /*
   * Raw Responses API structure:
   *
   * output[]
   *   -> message
   *      -> content[]
   *         -> output_text
   */
  const messageOutput =
    result?.output?.find(
      (item) =>
        item?.type === "message" &&
        item?.role === "assistant"
    );

  const textOutput =
    messageOutput?.content?.find(
      (item) =>
        item?.type ===
        "output_text"
    );

  if (
    typeof textOutput?.text ===
      "string" &&
    textOutput.text.trim()
  ) {
    return textOutput.text.trim();
  }

  return null;
};

/*
 * Main Grok text-generation function.
 *
 * Used by:
 * - normal BloomBoard conversation
 * - intent/preference interpretation
 * - explanation of real FLOGRAM listings
 */
export const generateGrokResponse =
  async (
    messages = [],
    options = {}
  ) => {
    const apiKey =
      getXaiApiKey();

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      const error = new Error(
        "At least one Grok input message is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const model =
      options.model ||
      XAI_MODEL;

    const requestBody = {
      model,

      input:
        messages,

      /*
       * FLOGRAM stores its own
       * conversation history in MongoDB.
       */
      store: false,
    };

    const response = await fetch(
      `${XAI_API_URL}/responses`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            requestBody
          ),
      }
    );

    let result;

    try {
      result =
        await response.json();
    } catch {
      const error = new Error(
        "Unable to read the Grok API response."
      );

      error.statusCode = 502;

      throw error;
    }

    if (!response.ok) {
      console.error(
        "xAI API error:",
        result
      );

      const apiMessage =
        result?.error?.message ||
        result?.error ||
        result?.message;

      const error = new Error(
        typeof apiMessage ===
          "string"
          ? apiMessage
          : "Grok API request failed."
      );

      error.statusCode = 502;

      error.xaiCode =
        result?.code ||
        result?.error?.code ||
        null;

      throw error;
    }

    const content =
      extractResponseText(
        result
      );

    if (!content) {
      console.error(
        "Unexpected Grok response:",
        result
      );

      const error = new Error(
        "Grok returned an empty response."
      );

      error.statusCode = 502;

      throw error;
    }

    return {
      content,

      model:
        result?.model ||
        model,

      responseId:
        result?.id ||
        null,
    };
  };

/*
 * Grok Imagine image generation.
 *
 * Used for generating bouquet
 * inspiration images inside the
 * BloomBoard AI conversation.
 */
export const generateGrokImage =
  async (
    prompt,
    options = {}
  ) => {
    const apiKey =
      getXaiApiKey();

    const trimmedPrompt =
      String(
        prompt || ""
      ).trim();

    if (!trimmedPrompt) {
      const error = new Error(
        "Image generation prompt is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const model =
      options.model ||
      XAI_IMAGE_MODEL;

    const requestBody = {
      model,

      prompt:
        trimmedPrompt,

      response_format:
        "url",

      n: 1,
    };

    /*
     * Optional image settings.
     *
     * Only add them when supplied
     * so we do not send unsupported
     * empty values.
     */
    if (
      options.aspectRatio
    ) {
      requestBody.aspect_ratio =
        options.aspectRatio;
    }

    if (
      options.resolution
    ) {
      requestBody.resolution =
        options.resolution;
    }

    /*
     * xAI can optionally persist
     * generated images through its
     * Files API.
     *
     * We will not enable this by
     * default because FLOGRAM will
     * later save its own copy.
     */
    if (
      options.storageOptions
    ) {
      requestBody.storage_options =
        options.storageOptions;
    }

    const response = await fetch(
      `${XAI_API_URL}/images/generations`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            requestBody
          ),
      }
    );

    let result;

    try {
      result =
        await response.json();
    } catch {
      const error = new Error(
        "Unable to read the Grok Imagine response."
      );

      error.statusCode = 502;

      throw error;
    }

    if (!response.ok) {
      console.error(
        "xAI image API error:",
        result
      );

      const apiMessage =
        result?.error?.message ||
        result?.error ||
        result?.message;

      const error = new Error(
        typeof apiMessage ===
          "string"
          ? apiMessage
          : "Grok Imagine request failed."
      );

      error.statusCode = 502;

      error.xaiCode =
        result?.code ||
        result?.error?.code ||
        null;

      throw error;
    }

    const image =
      result?.data?.[0];

    if (!image?.url) {
      console.error(
        "Unexpected Grok Imagine response:",
        result
      );

      const error = new Error(
        "Grok Imagine returned no image."
      );

      error.statusCode = 502;

      throw error;
    }

    return {
      url:
        image.url,

      mimeType:
        image.mime_type ||
        "image/jpeg",

      revisedPrompt:
        image.revised_prompt ||
        null,

      model,

      /*
       * These may exist when
       * storage_options is enabled.
       */
      fileId:
        image?.file_output
          ?.file_id ||
        null,

      persistentUrl:
        image?.file_output
          ?.public_url ||
        null,

      usage:
        result?.usage ||
        null,
    };
  };