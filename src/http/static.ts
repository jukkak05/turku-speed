const staticHandler = async (req: Request): Promise<Response> => {
  console.log(req);
};

export { staticHandler };
