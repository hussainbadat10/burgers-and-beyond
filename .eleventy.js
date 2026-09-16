module.exports = function (eleventyConfig) {
  // Everything outside src/ (css, js, images) is already well-organized and
  // has nothing to template — copy it straight through to the build output
  // rather than moving it under src/ too, so this migration only touches
  // the HTML page structure, not the asset layout.
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('images');
  eleventyConfig.addPassthroughCopy('sw.js');
  eleventyConfig.addPassthroughCopy('site.webmanifest');
  eleventyConfig.addPassthroughCopy('robots.txt');
  eleventyConfig.addPassthroughCopy('sitemap.xml');

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      output: '_site'
    },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
