export async function getLogoImage(req: Bun.BunRequest<"/api/images/logos/:logo">) {
  const file = Bun.file(`${import.meta.dir}/../assets/logos/${req.params.logo}`);

  const exists = await file.exists();
  console.log("DOES FILE EXIST?", exists, req.params.logo);
  console.log("PATH:", import.meta.dir, `${import.meta.dir}/assets/logos/${req.params.logo}`);
  if (!exists) {
    return new Response("Image not found", {
      status: 404,
      headers: {
        "Content-Type": "image/png",
      },
    });
  }

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}