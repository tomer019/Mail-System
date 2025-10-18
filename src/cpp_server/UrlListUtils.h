#ifndef URLLISTUTILS_H        // Header guard start – prevents multiple includes
#define URLLISTUTILS_H

#include <string>
#include <set>                // For std::set to store the URL list

// Loads a URL list from file into a std::set<string>.
// Returns true on success, false if file is missing or corrupted.
class UrlListUtils {
    

    // Saves a URL list to file, writing one URL per line.
    void save_url_list_to_file(const std::string& filename, const std::set<std::string>& url_list);

    // Checks the URL structure.
    public:
        static bool is_valid_url(const std::string& url);
        static bool load_url_list_from_file(const std::string& filename, std::set<std::string>& url_list);
};
#endif  // End of header guard

