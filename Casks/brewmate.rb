cask "brewmate" do
  version '1.0.33'

  url "https://github.com/romankurnovskii/BrewMate/releases/download/#{version}/BrewMate-#{version}-universal.dmg"
  name "BrewMate"
  desc "Homebrew GUI apps manager"
  homepage "https://github.com/romankurnovskii/BrewMate"
  sha256 '145a9d19c8b289565083f62d05882bc1309bbb35f3bf1cf4bda6606209a64fc4'

  auto_updates true

  app "BrewMate.app"

  zap trash: [
    "~/Library/Application Support/brewmate",
  ]
end
