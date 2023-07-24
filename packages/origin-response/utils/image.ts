import sharp, { Sharp } from "sharp";
import { validImageAction, isNumberString } from "./validator";
import { IMAGE_OPERATION_SPLIT } from "./constance";
import { logTime } from ".";
import { ImageAction, ResizeImageAction } from "../types";

/**
 * 解析操作字符串
 */
function parseOperationString(argString: string) {
    const actionsString = argString
        .split(IMAGE_OPERATION_SPLIT)
        .filter((item) => !!item);
    const result = [];
    for (const actionString of actionsString) {
        const [actionName, ...args] = actionString.split(",");
        const action = {
            actionName,
            args: {},
        } as ImageAction;
        args.forEach((arg) => {
            const argKey = arg.split("_")[0];
            const argValue = arg.split("_")[1].trim();
            Object.assign(action.args, { [argKey]: argValue });
        });
        validImageAction(action);
        result.push(action);
    }
    return result;
}

/**
 * 裁剪图片
 */
function resizeImage(imageHandle: Sharp, args: ResizeImageAction["args"]) {
    const { m, w, h, limit = "0" } = args;
    const numW = isNumberString(w) ? Number(w) : undefined;
    const numH = isNumberString(h) ? Number(h) : undefined;
    if (m === "lfit") {
        if (!numW && !numH) {
            throw new Error(`Missing required argument: w or h`);
        }
        return imageHandle.resize(numW, numH, {
            fit: "outside",
            withoutEnlargement: limit === "1",
        });
    } else if (m === "mfit") {
        if (!numW && !numH) {
            throw new Error(`Missing required argument: w or h`);
        }
        return imageHandle.resize(numW, numH, {
            fit: "inside",
            withoutEnlargement: limit === "1",
        });
    } else {
        throw new Error(`Invalid resize mode: ${m}`);
    }
}

export async function imageTransfer(
    imageBuffer: Uint8Array,
    operationString: string,
) {
    let imageHandle = sharp(imageBuffer);
    const metadata = await logTime(
        async () => await imageHandle.metadata(),
        "Read metadata before transform",
    );
    const actions = parseOperationString(operationString);
    let quality = 0;
    let format = metadata.format;
    for (const action of actions) {
        const { actionName, args } = action;
        if (actionName === "resize") {
            imageHandle = resizeImage(imageHandle, args);
        } else if (actionName === "quality") {
            quality = Number(args.q);
        }
        // 注意：如果格式是 auto 会恒定转换为 webp，webp 回落交给 request.handler 处理
        else if (actionName === "format") {
            const targetFormat = args.f;
            if (targetFormat === "auto") {
                format = "webp";
            } else {
                format = targetFormat;
            }
        }
    }

    // 如果有 format 或者 quality 操作，就需要重新对图片格式化
    if (
        actions.map((item) => item.actionName).includes("format") ||
        actions.map((item) => item.actionName).includes("quality")
    ) {
        imageHandle = await logTime(
            async () =>
                imageHandle.toFormat(format, { quality: quality || undefined }),
            "Transform format and quantity",
        );
    }
    return {
        buffer: await imageHandle.toBuffer(),
        contentType: `image/${format}`,
    };
}