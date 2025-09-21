{ pkgs }: {
  # Required Nixpkgs channel
  channel = "stable-24.11";

  # Global packages available in the environment
  packages = [
    pkgs.nodejs_20
    pkgs.zulu
    pkgs.buildpack
    pkgs.docker
  ];

  # Optional environment variables
  env = { };

  # Firebase Studio (IDX) specific settings
  idx = {
    extensions = [
      # Add extensions like "vscodevim.vim" if needed
    ];
    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
