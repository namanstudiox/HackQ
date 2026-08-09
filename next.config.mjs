/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Pin the project root explicitly — otherwise Turbopack walks up from cwd
    // looking for a lockfile and grabs the stray /home/<user>/package-lock.json
    // (outside this Git repo), which it then has to ignore.
    root: import.meta.dirname,
  },
};

export default nextConfig;
