cask "brewmate" do
  version '1.0.41'

  url "https://github.com/romankurnovskii/BrewMate/releases/download/#{version}/BrewMate-#{version}-universal.dmg"
  name "BrewMate"
  desc "Homebrew GUI apps manager"
  homepage "https://github.com/romankurnovskii/BrewMate"
  sha256 'ea9e756c0b6f21f405a285bb0a6a01b9126b58ae16d365b51e63a12be93fb36f'

  auto_updates true

  app "BrewMate.app"

  zap trash: [
    "~/Library/Application Support/brewmate",
  ]
end
