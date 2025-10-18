# Mail

## Project Overview

This project implements a **Bloom Filter** data structure for efficiently checking the existence of URLs.  
The system allows:
- Dynamic creation of a Bloom Filter based on user input
- Adding and querying URLs
- Running entirely inside a Docker container via command-line interface

---

## Project Structure

```
/src        - Source files (C++ .cpp and .h)
/tests      - Test files (currently not used)
/data       - Data files (e.g., urls.txt)
/Dockerfile - Docker setup
/README.md  - Project documentation
```

---

## Build and Run Instructions

### Build the Docker image

```bash
docker build -t bloom-filter .
```

### Run the application

```bash
docker run -it -v "$(pwd)/data:/app/data" bloom-filter
```

> **Important:**  
> - The `-it` flag is required to enable interactive input via `cin`.
> - The application will first prompt you to configure the Bloom Filter.

---

## Expected Input

1. **Initial Configuration**:  
   Enter a line specifying:
   
   ```
   <bit array size> <number of iterations of first hash function> [optional: number of iterations of second hash function]
   ```
   
   Example:
   ```
   256 2 1
   ```

2. **URL Commands**:  
   After configuration, you can add or query URLs interactively:
   <br>
   Adding URL:
    ```
   1 <URL>
     ```
   Checking if URL is in list:
    ```
   2 <URL>
    ```
    Only valid URLs can be added.
---

## Example Run

  ```
   a
   8 1
   2 www.tomer.com
   false
   1 www.tomer.com
   2 www.tomer.com
   true true
   1 ww.meir.com
   2 ww.meir.com
   2 www.meir.com
   false
  ```
Below is an example of program execution:
![Example Run](data/images/example_usage.png)
---

## Notes

- Data files are located under the `/data` directory.
- The application expects to find (or create) `urls.txt` at `../data/urls.txt` relative to the executable's runtime location.
- If the file does not exist, it will be created automatically.

---

## Authors

- Developed by Almog Meirov, Tomer Grady, Meir Crown

---

## Technologies Used

- **C++17**
- **Docker**
- **Bloom Filter Data Structure**
- **Regex-based URL validation**

---

# Enjoy!
