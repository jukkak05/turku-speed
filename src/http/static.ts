const staticHandler = async (req: Request, url: URL): Promise<Response> => {
  
  // URL object for the public folder root
  const publicFolder = new URL('../../public', import.meta.url);
  
  // URL object for file in public folder
  const fileUrl = url.pathname === '/'
  ? new URL('index.html', publicFolder)
  : new URL(url.pathname.slice(1), publicFolder);

  // Extract file extension from file path
  const filePath = fileUrl.pathname; 
  const fileExtension = filePath.split('.').pop() ?? '';

  // Only allow html, css and js files
  const allowedTypes = ['html', 'css', 'js'];
  if (!allowedTypes.includes(fileExtension)) {
    return new Response('Nothing to see here!', { status: 403} );
  }

  // Read fie and fileinfo
  const file = await Deno.readFile(fileUrl);
  const fileInfo = await Deno.stat(fileUrl);

  // Set last modified time
  const lastModified = fileInfo.mtime?.toUTCString(); 

  // Headers for different file types 
  const fileHeaders = {
    html: {
      type: 'text/html', 
      cache: 'public, max-age=60, must-revalidate', 
      modified: lastModified
    }, 
    js: {
      type: 'application/javascript',
      cache: 'public, max-age=86400, must-revalidate',
      modified: lastModified
    }, 
    css: {
      type: 'text/css',
      cache: 'public, max-age=86400, must-revalidate',
      modified: lastModified
    }
  };



};

export { staticHandler };
