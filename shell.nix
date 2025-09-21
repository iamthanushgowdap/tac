{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.docker
    pkgs.buildpack  # This is the `pack` CLI tool
  ];
}
