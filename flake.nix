{
  description = "House Planner — browser-based 3D house planning tool (React + TypeScript + Three.js)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          name = "house-planner";

          packages = [
            pkgs.nodejs_22 # ships npm; the project needs Node 20+
            pkgs.typescript-language-server
            pkgs.vscode-langservers-extracted # html/css/json language servers
          ];

          # npm pulls in prebuilt native addons (rolldown/esbuild bindings). They
          # are not patched for NixOS, so give their dlopen() a library path.
          LD_LIBRARY_PATH = nixpkgs.lib.makeLibraryPath [
            pkgs.stdenv.cc.cc.lib
            pkgs.zlib
          ];

          shellHook = ''
            echo "house-planner · node $(node --version) · npm $(npm --version)"
            echo "  npm install   install dependencies"
            echo "  npm run dev   http://localhost:5173"
            echo "  npm test      unit + integration tests"
            echo "  npm run build typecheck + production build into dist/"
          '';
        };
      });

      # The production build: a self-contained static site in $out.
      packages = forAllSystems (pkgs: rec {
        house-planner = pkgs.buildNpmPackage {
          pname = "house-planner";
          version = "0.1.0";
          src = ./.;

          # Update with: nix run nixpkgs#prefetch-npm-deps -- package-lock.json
          npmDepsHash = "sha256-s+B+1tr9P90dlAnI5b7h4j5i0OLrrrnec9nsVYZJa44=";

          nodejs = pkgs.nodejs_22; # same version as the dev shell

          nativeBuildInputs = [ pkgs.autoPatchelfHook ];
          buildInputs = [ pkgs.stdenv.cc.cc.lib ];

          installPhase = ''
            runHook preInstall
            cp -r dist $out
            runHook postInstall
          '';

          meta = {
            description = "Browser-based 3D house planner with a synchronized 2D floor plan editor";
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        default = house-planner;
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
