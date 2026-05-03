export function renderToolSwitchMarkup(registry) {
  return registry
    .map(
      (tool) =>
        `<button class="tool-switch__btn" type="button" data-tool-target="${tool.id}">${tool.buttonLabel}</button>`
    )
    .join("");
}

export function renderToolMountMarkup(registry) {
  return registry
    .map((tool) => `<section id="${tool.mountId}" class="tool-mount" data-tool="${tool.id}" hidden></section>`)
    .join("");
}
