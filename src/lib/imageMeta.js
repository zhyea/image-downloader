import { t } from "./i18n.js";

const SOURCE_I18N = {
  img: "sourceImg",
  picture: "sourcePicture",
  "video poster": "sourceVideoPoster",
  favicon: "sourceFavicon",
  "inline style": "sourceInlineStyle",
  "CSS background": "sourceCssBackground",
};

export function sourceLabel(source) {
  const key = SOURCE_I18N[source];
  return key ? t(key) : t("sourceUnknown");
}

export function formatItemDimensions(item) {
  return item.width && item.height ? `${item.width}×${item.height}` : t("dimUnknown");
}
