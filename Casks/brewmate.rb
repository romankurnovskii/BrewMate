cask "brewmate" do
  version '1.0.41'

  url "https://github.com/romankurnovskii/BrewMate/releases/download/#{version}/BrewMate-#{version}-universal.dmg"
  name "BrewMate"
  desc "Homebrew GUI apps manager"
  homepage "https://github.com/romankurnovskii/BrewMate"
  sha256 '7527d368565ba3934d43512ab873750d3ac2c4749cb4c897757e53a3ffa37f02'

  auto_updates true

  app "BrewMate.app"

  zap trash: [
    "~/Library/Application Support/brewmate",
  ]
end
