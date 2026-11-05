const FILE_EXTENSION = /\.[a-z0-9]+$/i

/** A path naming a file must not receive the app shell: a browser would parse HTML as that file. */
export function isSpaRoute(pathname) {
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  return !FILE_EXTENSION.test(lastSegment) || lastSegment.toLowerCase().endsWith('.html')
}
