//! Media element rendering

use maud::{Markup, html};
use sevenmark_parser::ast::{Element, Parameters, ResolvedMediaInfo};

use crate::classes;
use crate::context::RenderContext;
use crate::render::{render_elements, utils};

pub fn render(
    parameters: &Parameters,
    children: &[Element],
    resolved_info: Option<&ResolvedMediaInfo>,
    ctx: &mut RenderContext,
) -> Markup {
    let style = utils::build_style(parameters);

    // 파일 정보 추출 (URL, 유효성, 크기)
    let file_info = resolved_info.and_then(|r| r.file.as_ref());
    let image_src: Option<String> = file_info.map(|f| {
        if let Some(base) = ctx.config.file_base_url {
            format!("{}{}", base, f.url)
        } else {
            f.url.clone()
        }
    });
    let image_valid = file_info.is_some_and(|f| f.is_valid);
    let image_width = file_info.and_then(|f| f.width);
    let image_height = file_info.and_then(|f| f.height);

    // alt 텍스트: 파일 제목 사용
    let alt_text = utils::get_param(parameters, "file").unwrap_or_default();

    // href 우선순위: url > document > category
    let href: Option<String> = resolved_info.and_then(|r| {
        r.url
            .clone()
            .or_else(|| {
                r.document.as_ref().and_then(|d| {
                    ctx.config
                        .document_base_url
                        .map(|base| format!("{}{}", base, d.title))
                })
            })
            .or_else(|| {
                r.category.as_ref().and_then(|c| {
                    ctx.config
                        .category_base_url
                        .map(|base| format!("{}{}", base, c.title))
                })
            })
    });

    // 링크 유효성 (외부 url은 항상 valid 취급)
    let href_valid = resolved_info
        .map(|r| {
            if r.url.is_some() {
                true // 외부 링크는 항상 valid
            } else if let Some(doc) = &r.document {
                doc.is_valid
            } else if let Some(cat) = &r.category {
                cat.is_valid
            } else {
                true
            }
        })
        .unwrap_or(true);

    let caption = if children.is_empty() {
        None
    } else {
        Some(render_elements(children, ctx))
    };

    // 이미지가 있는 경우
    if let Some(src) = image_src {
        if let Some(ref link) = href {
            // 이미지 + 링크
            let link_class = if href_valid {
                classes::MEDIA_LINK
            } else {
                classes::MEDIA_LINK_INVALID
            };
            html! {
                a class=(link_class) href=(link) style=[style] {
                    figure class=(classes::MEDIA_IMAGE) {
                        @if image_valid {
                            img src=(src) width=[image_width] height=[image_height] alt=(alt_text) loading="lazy";
                        } @else {
                            span class=(classes::MEDIA_IMAGE_BROKEN) {}
                        }
                        @if let Some(cap) = caption {
                            figcaption { (cap) }
                        }
                    }
                }
            }
        } else {
            // 이미지만
            html! {
                figure class=(classes::MEDIA_IMAGE) style=[style] {
                    @if image_valid {
                        img src=(src) width=[image_width] height=[image_height] alt=(alt_text) loading="lazy";
                    } @else {
                        span class=(classes::MEDIA_IMAGE_BROKEN) {}
                    }
                    @if let Some(cap) = caption {
                        figcaption { (cap) }
                    }
                }
            }
        }
    } else if let Some(ref link) = href {
        // 링크만 (이미지 없음)
        let link_class = if href_valid {
            classes::MEDIA_LINK
        } else {
            classes::MEDIA_LINK_INVALID
        };
        html! {
            a class=(link_class) href=(link) style=[style] {
                @if let Some(cap) = caption {
                    (cap)
                } @else {
                    (link)
                }
            }
        }
    } else {
        // 아무것도 없음
        html! {}
    }
}
