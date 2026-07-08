module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "只支持 POST 请求" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: "还没有配置 OPENAI_API_KEY" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const { image } = body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      response.status(400).json({ error: "请上传一张图片" });
      return;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "你是一个谨慎的食物热量估算助手。请根据图片估算这餐的主要名称、总热量 kcal、分类和可信度。只能返回 JSON，不要返回 Markdown。分类必须是：正餐、饮料、甜品、零食、水果、其他。无法确定时保守估算，并在 note 说明不确定因素。"
              },
              {
                type: "input_image",
                image_url: image
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "meal_estimate",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                calories: { type: "number" },
                category: {
                  type: "string",
                  enum: ["正餐", "饮料", "甜品", "零食", "水果", "其他"]
                },
                confidence: {
                  type: "string",
                  enum: ["低", "中", "高"]
                },
                note: { type: "string" }
              },
              required: ["name", "calories", "category", "confidence", "note"]
            },
            strict: true
          }
        }
      })
    });

    const result = await openaiResponse.json();
    if (!openaiResponse.ok) {
      response.status(openaiResponse.status).json({
        error: result.error?.message || "AI 识别失败"
      });
      return;
    }

    const text =
      result.output_text ||
      result.output?.flatMap((item) => item.content || [])?.find((item) => item.type === "output_text")?.text;

    if (!text) {
      response.status(502).json({ error: "AI 没有返回可解析结果" });
      return;
    }

    const estimate = JSON.parse(text);
    response.status(200).json({
      name: String(estimate.name || "这餐"),
      calories: Math.max(0, Math.round(Number(estimate.calories || 0))),
      category: estimate.category || "其他",
      confidence: estimate.confidence || "中",
      note: estimate.note || ""
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "服务器处理失败"
    });
  }
};

function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    return Promise.resolve(JSON.parse(request.body));
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
